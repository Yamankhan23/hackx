import { google } from "googleapis";
import { Readable } from "stream";

// Storage backend for team PPT submissions: a dedicated Google account
// (not any real admin's own account) owns a single Drive folder, and the
// backend authenticates as it via a long-lived OAuth refresh token — see
// GOOGLE_OAUTH_* / GOOGLE_DRIVE_FOLDER_ID in .env. This keeps admin download
// access independent of any individual admin's Google identity: the backend
// proxies every read/write through this one service credential.
let driveClient: ReturnType<typeof google.drive> | null = null;

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getDriveClient = () => {
  if (driveClient) {
    return driveClient;
  }

  const oauth2Client = new google.auth.OAuth2(
    requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET")
  );

  oauth2Client.setCredentials({
    refresh_token: requiredEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
  });

  driveClient = google.drive({ version: "v3", auth: oauth2Client });
  return driveClient;
};

export const uploadPptToDrive = async ({
  buffer,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{ driveFileId: string }> => {
  const drive = getDriveClient();
  const folderId = requiredEnv("GOOGLE_DRIVE_FOLDER_ID");

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const driveFileId = response.data.id;

  if (!driveFileId) {
    throw new Error("Google Drive did not return a file id after upload");
  }

  return { driveFileId };
};

// Best-effort — called when a re-upload replaces a previous submission.
// Swallows "already gone" (404) so a stale/duplicate cleanup call is a no-op
// instead of failing the new upload it's cleaning up after.
export const deletePptFromDrive = async (driveFileId: string): Promise<void> => {
  const drive = getDriveClient();

  try {
    await drive.files.delete({ fileId: driveFileId });
  } catch (error) {
    const status = (error as { code?: number; response?: { status?: number } })?.response?.status
      ?? (error as { code?: number })?.code;

    if (status !== 404) {
      throw error;
    }
  }
};

// Streams the raw file bytes back — used by the admin download-proxy
// endpoint so the file never needs to be public or shared with any
// individual admin's own Google account.
export const downloadPptStream = async (driveFileId: string) => {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "stream" }
  );

  return response.data;
};

export type Domain = {
  id: number;
  name: string;
};

export type College = {
  id: number;
  collegeId: string;
  name: string;
  university: string | null;
  region: string;
};

export type CollegeReference =
  | {
      collegeId: string;
      collegeName?: never;
    }
  | {
      collegeId?: never;
      collegeName: string;
    };

export type TeamMemberInput = {
  role: "LEADER" | "MEMBER";
  fullName: string;
  email: string;
  mobileNumber: string;
  college: CollegeReference;
  region: string;
  branch: string;
  yearOfStudy: number;
};

export type RegisterTeamPayload = {
  teamName: string;
  domainId: number;
  declarationAccepted: boolean;
  members: TeamMemberInput[];
};

export type RegisterTeamResponse = {
  teamId: string;
  registrationId: string;
  teamName: string;
  status: string;
  members: Array<{
    name: string;
    email: string;
    emailVerified: boolean;
  }>;
};

export type TeamFormValues = {
  teamName: string;
  domainId: string;
  declarationAccepted?: boolean;
  members: Array<{
    role: "LEADER" | "MEMBER";
    fullName: string;
    email: string;
    mobileNumber: string;
    selectedCollegeId?: string;
    selectedCollegeName?: string;
    collegeName?: string;
    region: string;
    branch: string;
    yearOfStudy: string;
  }>;
};

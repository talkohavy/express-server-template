export type LeaseProps = {
  userId: string;
  socketId: string;
};

export type UserLeasesProps = {
  userId: string;
  socketIds: string[];
};

export type ExecuteScriptProps = {
  script: string;
  keys: string[];
  args: string[];
};

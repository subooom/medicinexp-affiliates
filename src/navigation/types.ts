export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Visits: undefined;
  Leads: undefined;
  Commissions: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  VisitDetails: { id: number };
  LeadDetails: { id: number };
  CreateLead: undefined;
  CheckIn: undefined;
};
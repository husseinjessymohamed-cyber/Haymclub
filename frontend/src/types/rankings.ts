export interface RankingItem {
  rank: number;
  traineeId: string;
  registrationCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImageUrl: string | null;
  branchId: string;
  points: number;
  note: string | null;
}

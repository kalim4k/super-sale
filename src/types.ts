export interface QuizState {
  age: string;
  country: string;
  wantsAmira: string;
  wantsAmiraContacts: string;
  wantsCatalogue: string;
  step: number; // 1: Age, 2: Country, 3: Amira Number Offer, 4: Amira 2500F Offer, 5: Catalogue Offer, 6: Final Catalogue & Buy
}

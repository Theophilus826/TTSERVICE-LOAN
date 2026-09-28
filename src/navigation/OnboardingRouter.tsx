import { getOnboardingStatus } from "../services/onboarding";

export const getNextOnboardingScreen = async () => {
  const response = await getOnboardingStatus();

  const onboarding = response.onboarding;

  switch (onboarding.nextStep) {
    case "KYC":
      return {
        screen: "KYC",
      };

    case "BANK":
      return {
        screen: "BankAccount",
      };

    case "LOAN":
      return {
        screen: "ApplyLoan",
      };

    case "REVIEW":
      return {
        screen: "LoanDetails",
        params: {
          loanId: onboarding.loan.loanId,
        },
      };

    case "OFFER":
      return {
        screen: "LoanOffers",
      };

    case "MANDATE":
      return {
        screen: "LoanOfferDetails",
        params: {
          offerId: onboarding.loanOffer.offerId,
        },
      };

    case "REPAYMENT":
      return {
        screen: "MyLoans",
      };

    default:
      return {
        screen: "KYC",
      };
  }
};
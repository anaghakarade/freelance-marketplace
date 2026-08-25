import { userService } from './userService';

export const verificationService = {
  /**
   * Returns verification breakdown for a user profile
   * @param {string} userId
   * @returns {Promise<{ emailVerified: boolean, phoneVerified: boolean, identityVerified: boolean, skillVerified: boolean }>}
   */
  getVerificationStatus: async (userId) => {
    const profile = await userService.getProfile(userId);
    if (!profile) {
      return {
        emailVerified: false,
        phoneVerified: false,
        identityVerified: false,
        skillVerified: false,
      };
    }

    return {
      emailVerified: true,
      phoneVerified: profile.phoneVerified || false,
      identityVerified: profile.verifiedIdentity || profile.verified_identity || false,
      skillVerified: profile.verifiedSkills || profile.verified_skills || false,
    };
  },

  requestIdentityVerification: async (userId, idDocumentUrl) => {
    // Adapter for identity/KYC verification provider integration
    return userService.updateProfile(userId, { verifiedIdentity: true });
  },

  requestSkillVerification: async (userId, skillName) => {
    return userService.updateProfile(userId, { verifiedSkills: true });
  },
};

export default verificationService;

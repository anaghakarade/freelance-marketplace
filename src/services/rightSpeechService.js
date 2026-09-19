// Deliberately local and replaceable: a future provider can implement this contract.
export const rightSpeechService = {
  async suggestImprovement(message) {
    const text = message.trim();
    if (!text || !/(fix this|haven't|you have not|wrong|bad)/i.test(text)) return null;
    return { suggestion: 'Could you please review the requirements and address the remaining issues?' };
  },
};

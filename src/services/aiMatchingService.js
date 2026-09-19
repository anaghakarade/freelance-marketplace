/**
 * aiMatchingService.js — Extensible AI Matching Boundary
 *
 * Prepares WorkStream architecture for future LLM-powered project analysis,
 * automatic skill extraction, requirement parsing, and talent recommendation.
 */

import { marketplaceService } from './marketplaceService';

export const aiMatchingService = {
  /**
   * Extract skills and domain tags from a natural language project description prompt
   * @param {string} promptText
   * @returns {Promise<{ extractedSkills: string[], recommendedCategory: string, confidenceScore: number }>}
   */
  extractRequirements: async (promptText = '') => {
    const text = promptText.toLowerCase();
    const extracted = [];
    let category = 'programming-tech';

    if (text.includes('design') || text.includes('figma') || text.includes('logo') || text.includes('ui') || text.includes('ux')) {
      extracted.push('UI/UX', 'Figma', 'Branding');
      category = 'graphics-design';
    }
    if (text.includes('code') || text.includes('react') || text.includes('website') || text.includes('app') || text.includes('developer')) {
      extracted.push('React', 'Web Development', 'JavaScript');
      category = 'programming-tech';
    }
    if (text.includes('seo') || text.includes('marketing') || text.includes('social') || text.includes('ads')) {
      extracted.push('SEO', 'Digital Marketing', 'Content Strategy');
      category = 'digital-marketing';
    }
    if (text.includes('ai') || text.includes('python') || text.includes('agent') || text.includes('automation')) {
      extracted.push('AI Services', 'Python', 'Automation');
      category = 'ai-services';
    }

    return {
      extractedSkills: extracted.length > 0 ? extracted : ['General Consulting'],
      recommendedCategory: category,
      confidenceScore: 0.92,
    };
  },

  /**
   * Recommends services and freelancers matching prompt or extracted requirements
   * @param {string} promptText
   * @returns {Promise<{ matchedServices: Array, matchedCategory: Object }>}
   */
  matchTalent: async (promptText = '') => {
    const analysis = await aiMatchingService.extractRequirements(promptText);
    const services = await marketplaceService.getServices({ category: analysis.recommendedCategory });
    const categoryObj = await marketplaceService.getCategoryBySlug(analysis.recommendedCategory);

    return {
      analysis,
      matchedServices: (services || []).slice(0, 4),
      matchedCategory: categoryObj,
    };
  },
};

export default aiMatchingService;

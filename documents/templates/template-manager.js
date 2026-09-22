// Document Template Engine & Smart Selector
export class TemplateManager {
  constructor() {
    this.templates = {
      // 1. Business
      business_proposal: {
        id: 'business_proposal',
        name: 'Business Proposal',
        category: 'Business',
        primaryColor: '#0052CC',
        sections: ['Title', 'Executive Summary', 'Problem Statement', 'Proposed Solution', 'Scope of Work', 'Timeline & Milestones', 'Budget & Pricing', 'Conclusion']
      },
      project_report: {
        id: 'project_report',
        name: 'Project Report',
        category: 'Business',
        primaryColor: '#006644',
        sections: ['Title', 'Executive Summary', 'Project Overview', 'Objectives', 'Architecture & Methodology', 'Implementation Details', 'Key Results', 'Challenges & Mitigation', 'Future Roadmap', 'Conclusion']
      },
      executive_report: {
        id: 'executive_report',
        name: 'Executive Summary Report',
        category: 'Business',
        primaryColor: '#172B4D',
        sections: ['Title', 'Executive Overview', 'Market Analysis', 'Financial Highlights', 'Strategic Goals', 'Next Steps']
      },

      // 2. Management
      weekly_report: {
        id: 'weekly_report',
        name: 'Weekly Status Report',
        category: 'Management',
        primaryColor: '#403294',
        sections: ['Title', 'Weekly Highlights', 'Key Accomplishments', 'In Progress Tasks', 'Blockers & Risks', 'Next Week Priorities']
      },
      monthly_report: {
        id: 'monthly_report',
        name: 'Monthly Business Review',
        category: 'Management',
        primaryColor: '#0747A6',
        sections: ['Title', 'Monthly Performance Overview', 'KPI Metrics', 'Departmental Updates', 'Financial Performance', 'Strategic Focus for Next Month']
      },

      // 3. Academic
      research_paper: {
        id: 'research_paper',
        name: 'Academic Research Paper',
        category: 'Academic',
        primaryColor: '#36B37E',
        sections: ['Title', 'Abstract', 'Introduction', 'Literature Review', 'Methodology', 'Experimental Setup & Results', 'Discussion', 'Conclusion', 'References']
      },

      // 4. Professional
      resume_professional: {
        id: 'resume_professional',
        name: 'Professional Resume',
        category: 'Professional',
        primaryColor: '#253858',
        sections: ['Header & Contact', 'Professional Summary', 'Core Skills', 'Work Experience', 'Key Accomplishments', 'Education & Certifications']
      },

      // 5. Creative
      article_whitepaper: {
        id: 'article_whitepaper',
        name: 'Technical White Paper',
        category: 'Creative',
        primaryColor: '#FF5630',
        sections: ['Title', 'Executive Summary', 'Industry Context', 'Technology Breakthrough', 'Architecture & Mechanism', 'Case Study / Proof of Concept', 'Conclusion']
      }
    };
  }

  getTemplate(id) {
    return this.templates[id] || this.templates['project_report'];
  }

  getAllTemplates() {
    return Object.values(this.templates);
  }

  // Smart Auto-Selection based on user prompt text
  selectBestTemplate(promptText) {
    const clean = (promptText || '').toLowerCase();

    if (clean.includes('weekly') || clean.includes('week status')) return this.templates['weekly_report'];
    if (clean.includes('monthly') || clean.includes('month review')) return this.templates['monthly_report'];
    if (clean.includes('proposal') || clean.includes('bid')) return this.templates['business_proposal'];
    if (clean.includes('paper') || clean.includes('thesis') || clean.includes('research')) return this.templates['research_paper'];
    if (clean.includes('resume') || clean.includes('cv')) return this.templates['resume_professional'];
    if (clean.includes('whitepaper') || clean.includes('article')) return this.templates['article_whitepaper'];

    return this.templates['project_report'];
  }
}

const templateManager = new TemplateManager();
export default templateManager;

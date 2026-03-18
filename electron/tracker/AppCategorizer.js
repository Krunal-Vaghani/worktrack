/**
 * AppCategorizer
 * Classifies an app as 'work' | 'neutral' | 'non-work'.
 * Input is already normalized by ActivityMonitor (lowercase, .exe stripped, mapped to display name).
 */

class AppCategorizer {
  constructor(customRules = {}) {
    this.customRules = customRules;

    this.workApps = new Set([
      // Browsers (category determined by title/URL for these)
      // IDEs & editors
      'vs code', 'visual studio', 'visual studio code',
      'pycharm', 'intellij idea', 'webstorm', 'rider', 'goland',
      'android studio', 'xcode', 'eclipse', 'netbeans',
      'sublime text', 'notepad++', 'atom', 'vim', 'neovim',
      'cursor', 'windsurf', 'zed',
      // Terminals
      'windows terminal', 'command prompt', 'powershell', 'terminal',
      'iterm2', 'alacritty', 'wezterm', 'hyper',
      // Design
      'figma', 'adobe xd', 'sketch', 'invision',
      'photoshop', 'illustrator', 'indesign', 'affinity designer',
      'affinity photo', 'blender', 'inkscape', 'gimp',
      // Communication (work)
      'slack', 'microsoft teams', 'zoom', 'discord', 'webex',
      'loom', 'outlook',
      // Office / docs
      'microsoft word', 'microsoft excel', 'powerpoint',
      'libreoffice', 'notion', 'obsidian',
      // Dev tools
      'postman', 'insomnia', 'docker desktop', 'tableplus',
      'dbeaver', 'mongodb compass', 'pgadmin',
      'github desktop', 'sourcetree', 'gitkraken', 'fork',
    ]);

    this.nonWorkApps = new Set([
      'spotify', 'apple music', 'vlc', 'plex',
      'steam', 'epic games', 'origin', 'gog galaxy',
      'netflix', 'prime video',
      'whatsapp', 'telegram',
    ]);

    this.workBrowserTitles = [
      'github', 'gitlab', 'bitbucket', 'stackoverflow', 'stack overflow',
      'jira', 'confluence', 'linear', 'trello', 'asana', 'monday', 'clickup',
      'notion', 'figma', 'miro', 'airtable',
      'localhost', '127.0.0.1', '192.168.',
      'aws', 'azure', 'google cloud', 'vercel', 'netlify', 'heroku',
      'npm', 'node', 'python', 'react', 'vue', 'angular', 'typescript',
      'developer.mozilla', 'docs.', 'documentation', 'api reference',
      'google docs', 'google sheets', 'google slides', 'google drive',
      'microsoft 365', 'office',
      'zoom.us', 'teams', 'meet.google',
    ];

    this.nonWorkBrowserTitles = [
      'youtube', 'netflix', 'twitch', 'reddit',
      'twitter', 'instagram', 'facebook', 'tiktok',
      '9gag', 'buzzfeed', 'hulu', 'disney+',
    ];
  }

  categorize(appName = '', windowTitle = '') {
    const name  = appName.toLowerCase();
    const title = windowTitle.toLowerCase();

    // Custom rules override everything
    for (const [key, cat] of Object.entries(this.customRules)) {
      if (name.includes(key.toLowerCase())) return cat;
    }

    // Direct non-work match
    for (const app of this.nonWorkApps) {
      if (name.includes(app)) return 'non-work';
    }

    // Direct work match
    for (const app of this.workApps) {
      if (name.includes(app) || app.includes(name)) return 'work';
    }

    // Browser — classify by window title
    const isBrowser = ['chrome','firefox','edge','brave','opera','safari','arc','vivaldi','chromium'].some(b => name.includes(b));
    if (isBrowser && title) {
      for (const t of this.nonWorkBrowserTitles) {
        if (title.includes(t)) return 'non-work';
      }
      for (const t of this.workBrowserTitles) {
        if (title.includes(t)) return 'work';
      }
      // Browser with unrecognized title = neutral (could be work or not)
      return 'neutral';
    }

    // File explorer and system utils
    if (['file explorer','explorer','finder','task manager'].some(s => name.includes(s))) return 'neutral';

    return 'neutral';
  }

  updateCustomRules(rules) {
    this.customRules = { ...this.customRules, ...rules };
  }
}

module.exports = AppCategorizer;

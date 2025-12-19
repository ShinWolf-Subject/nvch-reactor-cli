#!/usr/bin/env node

const { auth, validateUrl, getPackageInfo } = require('nvch-reactor');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.nvch-reactor-config.json');
const HISTORY_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.nvch-reactor-history.json');

class NVCHCLI {
  constructor() {
    this.client = null;
    this.config = null;
    this.history = [];
  }

  // Utility functions
  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'cyan');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  question(prompt) {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
    });
  }

  clearScreen() {
    console.clear();
  }

  printBanner() {
    this.clearScreen();
    this.log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║                                                            ║', 'cyan');
    this.log('║               🚀 NVCH REACTOR CLI v2.0                     ║', 'bright');
    this.log('║          WhatsApp Channel Reaction Automation              ║', 'cyan');
    this.log('║                                                            ║', 'cyan');
    this.log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    console.log();
  }

  printMenu() {
    console.log();
    this.log('┌─────────────────────────── MENU ───────────────────────────┐', 'blue');
    this.log('│                                                            │', 'blue');
    this.log('│  1. 📤 Send Single Reaction                                │', 'white');
    this.log('│  2. 📦 Send Batch Reactions                                │', 'white');
    this.log('│  3. 📋 Load Reactions from File                            │', 'white');
    this.log('│  4. 🔗 Validate URL                                        │', 'white');
    this.log('│  5. 📊 View History                                        │', 'white');
    this.log('│  6. 🗑️  Clear History                                       │', 'white');
    this.log('│  7. ⚙️  Settings                                            │', 'white');
    this.log('│  8. 📈 Statistics                                          │', 'white');
    this.log('│  9. 💾 Export History                                      │', 'white');
    this.log('│  10. ℹ️  About                                              │', 'white');
    this.log('│  0. 🚪 Exit                                                │', 'white');
    this.log('│                                                            │', 'blue');
    this.log('└────────────────────────────────────────────────────────────┘', 'blue');
    console.log();
  }

  async loadConfig() {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
      if (this.config.apiKey) {
        this.client = auth(this.config.apiKey);
        return true;
      }
    } catch (error) {
      this.config = { apiKey: null, timeout: 20000, delay: 1000 };
    }
    return false;
  }

  async saveConfig() {
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.error('Failed to save configuration');
    }
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      this.history = [];
    }
  }

  async saveHistory() {
    try {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      this.error('Failed to save history');
    }
  }

  async addToHistory(entry) {
    this.history.unshift({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }
    
    await this.saveHistory();
  }

  async setupApiKey() {
    this.printBanner();
    this.log('🔑 API Key Setup', 'yellow');
    console.log();
    
    const apiKey = await this.question('Enter your API Key: ');
    
    if (!apiKey || apiKey.trim() === '') {
      this.error('API Key cannot be empty!');
      await this.pause();
      return false;
    }

    try {
      this.client = auth(apiKey.trim());
      this.config.apiKey = apiKey.trim();
      await this.saveConfig();
      this.success('API Key saved successfully!');
      await this.pause();
      return true;
    } catch (error) {
      this.error('Invalid API Key!');
      await this.pause();
      return false;
    }
  }

  async pause() {
    await this.question('\nPress Enter to continue...');
  }

  // Menu handlers
  async sendSingleReaction() {
    this.printBanner();
    this.log('📤 Send Single Reaction', 'yellow');
    console.log();

    const url = await this.question('WhatsApp Channel URL: ');
    
    if (!validateUrl(url)) {
      this.error('Invalid URL format!');
      this.info('Format: https://whatsapp.com/channel/{CHANNEL_ID}/{POST_ID}');
      await this.pause();
      return;
    }

    const emojis = await this.question('Emojis (comma-separated): ');
    
    if (!emojis || emojis.trim() === '') {
      this.error('Emojis cannot be empty!');
      await this.pause();
      return;
    }

    this.info('Sending reaction...');
    console.log();

    const startTime = Date.now();
    
    try {
      const result = await this.client.sendReaction(url, emojis);
      const duration = Date.now() - startTime;
      
      this.success('Reaction sent successfully!');
      console.log();
      this.log(`⏱️  Duration: ${duration}ms`, 'dim');
      this.log(`📩 Message: ${result.message}`, 'dim');
      this.log(`🤖 Bot Response: ${result.data.botResponse}`, 'dim');
      this.log(`🎭 Emojis: ${result.details.reacts}`, 'dim');
      
      await this.addToHistory({
        type: 'single',
        url,
        emojis,
        status: 'success',
        duration,
        message: result.message
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Failed: ${error.message}`);
      if (error.status) {
        this.log(`Status Code: ${error.status}`, 'red');
      }
      
      await this.addToHistory({
        type: 'single',
        url,
        emojis,
        status: 'failed',
        duration,
        error: error.message
      });
    }

    await this.pause();
  }

  async sendBatchReactions() {
    this.printBanner();
    this.log('📦 Send Batch Reactions', 'yellow');
    console.log();

    const count = parseInt(await this.question('How many reactions? '));
    
    if (isNaN(count) || count < 1) {
      this.error('Invalid number!');
      await this.pause();
      return;
    }

    const reactions = [];
    
    for (let i = 0; i < count; i++) {
      console.log();
      this.log(`── Reaction ${i + 1}/${count} ──`, 'cyan');
      
      const url = await this.question('  URL: ');
      
      if (!validateUrl(url)) {
        this.error('  Invalid URL! Skipping...');
        continue;
      }
      
      const emojis = await this.question('  Emojis: ');
      
      if (!emojis || emojis.trim() === '') {
        this.error('  Empty emojis! Skipping...');
        continue;
      }
      
      reactions.push({ url, emojis });
    }

    if (reactions.length === 0) {
      this.error('No valid reactions to send!');
      await this.pause();
      return;
    }

    console.log();
    const delay = parseInt(await this.question('Delay between requests (ms) [default: 1000]: ') || '1000');
    
    console.log();
    this.info(`Sending ${reactions.length} reactions with ${delay}ms delay...`);
    console.log();

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    try {
      const results = await this.client.sendBatchReactions(reactions, { delay });
      
      results.forEach((result, index) => {
        if (result.success) {
          successCount++;
          this.success(`${index + 1}. Success: ${result.data.message}`);
        } else {
          failCount++;
          this.error(`${index + 1}. Failed: ${result.error}`);
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log();
      this.log('═════════════════════════════════════════', 'blue');
      this.log(`📊 Batch Results`, 'bright');
      this.log(`   Total: ${results.length}`, 'white');
      this.log(`   ✅ Success: ${successCount}`, 'green');
      this.log(`   ❌ Failed: ${failCount}`, 'red');
      this.log(`   ⏱️  Duration: ${duration}ms`, 'dim');
      this.log('═════════════════════════════════════════', 'blue');
      
      await this.addToHistory({
        type: 'batch',
        total: reactions.length,
        success: successCount,
        failed: failCount,
        duration,
        status: failCount === 0 ? 'success' : 'partial'
      });
      
    } catch (error) {
      this.error(`Batch error: ${error.message}`);
      
      await this.addToHistory({
        type: 'batch',
        total: reactions.length,
        status: 'failed',
        error: error.message
      });
    }

    await this.pause();
  }

  async loadFromFile() {
    this.printBanner();
    this.log('📋 Load Reactions from File', 'yellow');
    console.log();
    
    this.info('File format should be JSON:');
    console.log();
    this.log('[', 'dim');
    this.log('  { "url": "https://...", "emojis": "👍,❤️" },', 'dim');
    this.log('  { "url": "https://...", "emojis": "🔥" }', 'dim');
    this.log(']', 'dim');
    console.log();

    const filePath = await this.question('File path: ');
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const reactions = JSON.parse(data);
      
      if (!Array.isArray(reactions)) {
        throw new Error('File must contain an array of reactions');
      }
      
      // Validate reactions
      const validReactions = reactions.filter(r => {
        return r.url && r.emojis && validateUrl(r.url);
      });
      
      if (validReactions.length === 0) {
        this.error('No valid reactions found in file!');
        await this.pause();
        return;
      }
      
      this.success(`Loaded ${validReactions.length} reactions`);
      
      const delay = parseInt(await this.question('\nDelay between requests (ms) [default: 1000]: ') || '1000');
      
      console.log();
      this.info(`Sending ${validReactions.length} reactions...`);
      console.log();

      const startTime = Date.now();
      let successCount = 0;
      let failCount = 0;

      const results = await this.client.sendBatchReactions(validReactions, { delay });
      
      results.forEach((result, index) => {
        if (result.success) {
          successCount++;
          this.log(`✅ ${index + 1}. Success`, 'green');
        } else {
          failCount++;
          this.log(`❌ ${index + 1}. Failed: ${result.error}`, 'red');
        }
      });
      
      const duration = Date.now() - startTime;
      
      console.log();
      this.log('═════════════════════════════════════════', 'blue');
      this.log(`📊 Results`, 'bright');
      this.log(`   Total: ${results.length}`, 'white');
      this.log(`   ✅ Success: ${successCount}`, 'green');
      this.log(`   ❌ Failed: ${failCount}`, 'red');
      this.log(`   ⏱️  Duration: ${duration}ms`, 'dim');
      this.log('═════════════════════════════════════════', 'blue');
      
      await this.addToHistory({
        type: 'file',
        file: filePath,
        total: results.length,
        success: successCount,
        failed: failCount,
        duration,
        status: failCount === 0 ? 'success' : 'partial'
      });
      
    } catch (error) {
      this.error(`Failed to load file: ${error.message}`);
    }

    await this.pause();
  }

  async validateUrlMenu() {
    this.printBanner();
    this.log('🔗 Validate URL', 'yellow');
    console.log();

    const url = await this.question('Enter URL to validate: ');
    
    console.log();
    
    if (validateUrl(url)) {
      this.success('✓ URL is valid!');
      
      // Extract channel and post ID
      const match = url.match(/channel\/([^\/]+)\/(\d+)/);
      if (match) {
        console.log();
        this.log(`📋 Details:`, 'dim');
        this.log(`   Channel ID: ${match[1]}`, 'dim');
        this.log(`   Post ID: ${match[2]}`, 'dim');
      }
    } else {
      this.error('✗ URL is invalid!');
      console.log();
      this.info('Valid format: https://whatsapp.com/channel/{CHANNEL_ID}/{POST_ID}');
      console.log();
      this.log('Example:', 'dim');
      this.log('https://whatsapp.com/channel/0029VbAzDjIBFLgbEyadQb3y/178', 'dim');
    }

    await this.pause();
  }

  async viewHistory() {
    this.printBanner();
    this.log('📊 Reaction History', 'yellow');
    console.log();

    if (this.history.length === 0) {
      this.warning('No history found!');
      await this.pause();
      return;
    }

    const limit = parseInt(await this.question('Show last entries [default: 10]: ') || '10');
    
    console.log();
    this.log('═════════════════════════════════════════════════════════════', 'blue');
    
    this.history.slice(0, limit).forEach((entry, index) => {
      console.log();
      this.log(`[${index + 1}] ${new Date(entry.timestamp).toLocaleString()}`, 'cyan');
      this.log(`    Type: ${entry.type}`, 'white');
      
      if (entry.type === 'single') {
        this.log(`    URL: ${entry.url}`, 'dim');
        this.log(`    Emojis: ${entry.emojis}`, 'dim');
      } else {
        this.log(`    Total: ${entry.total}`, 'dim');
        if (entry.success !== undefined) {
          this.log(`    Success: ${entry.success} | Failed: ${entry.failed}`, 'dim');
        }
      }
      
      this.log(`    Status: ${entry.status}`, entry.status === 'success' ? 'green' : 'red');
      
      if (entry.duration) {
        this.log(`    Duration: ${entry.duration}ms`, 'dim');
      }
      
      if (entry.error) {
        this.log(`    Error: ${entry.error}`, 'red');
      }
    });
    
    console.log();
    this.log('═════════════════════════════════════════════════════════════', 'blue');

    await this.pause();
  }

  async clearHistory() {
    this.printBanner();
    this.log('🗑️  Clear History', 'yellow');
    console.log();

    const confirm = await this.question('Are you sure? This cannot be undone! (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
      this.history = [];
      await this.saveHistory();
      this.success('History cleared!');
    } else {
      this.info('Cancelled.');
    }

    await this.pause();
  }

  async settings() {
    this.printBanner();
    this.log('⚙️  Settings', 'yellow');
    console.log();

    this.log('Current Settings:', 'cyan');
    this.log(`  API Key: ${this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'Not set'}`, 'white');
    this.log(`  Timeout: ${this.config.timeout}ms`, 'white');
    this.log(`  Delay: ${this.config.delay}ms`, 'white');
    console.log();
    
    this.log('Options:', 'cyan');
    this.log('  1. Change API Key', 'white');
    this.log('  2. Change Timeout', 'white');
    this.log('  3. Change Default Delay', 'white');
    this.log('  0. Back', 'white');
    console.log();

    const choice = await this.question('Select option: ');

    switch (choice) {
      case '1':
        await this.setupApiKey();
        break;
      case '2':
        const timeout = parseInt(await this.question('New timeout (ms): '));
        if (!isNaN(timeout) && timeout > 0) {
          this.config.timeout = timeout;
          await this.saveConfig();
          this.success('Timeout updated!');
        } else {
          this.error('Invalid timeout!');
        }
        await this.pause();
        break;
      case '3':
        const delay = parseInt(await this.question('New default delay (ms): '));
        if (!isNaN(delay) && delay >= 0) {
          this.config.delay = delay;
          await this.saveConfig();
          this.success('Default delay updated!');
        } else {
          this.error('Invalid delay!');
        }
        await this.pause();
        break;
    }
  }

  async statistics() {
    this.printBanner();
    this.log('📈 Statistics', 'yellow');
    console.log();

    if (this.history.length === 0) {
      this.warning('No history data available!');
      await this.pause();
      return;
    }

    const total = this.history.length;
    const successful = this.history.filter(h => h.status === 'success').length;
    const failed = this.history.filter(h => h.status === 'failed').length;
    const partial = this.history.filter(h => h.status === 'partial').length;
    
    const singleReactions = this.history.filter(h => h.type === 'single').length;
    const batchReactions = this.history.filter(h => h.type === 'batch').length;
    const fileReactions = this.history.filter(h => h.type === 'file').length;
    
    const avgDuration = Math.round(
      this.history.filter(h => h.duration).reduce((sum, h) => sum + h.duration, 0) / 
      this.history.filter(h => h.duration).length
    );

    this.log('═════════════════════════════════════════', 'blue');
    this.log('  Overall Statistics', 'bright');
    this.log('═════════════════════════════════════════', 'blue');
    this.log(`  Total Requests: ${total}`, 'white');
    this.log(`  ✅ Successful: ${successful}`, 'green');
    this.log(`  ❌ Failed: ${failed}`, 'red');
    this.log(`  ⚠️  Partial: ${partial}`, 'yellow');
    console.log();
    this.log('  By Type:', 'cyan');
    this.log(`    Single: ${singleReactions}`, 'white');
    this.log(`    Batch: ${batchReactions}`, 'white');
    this.log(`    File: ${fileReactions}`, 'white');
    console.log();
    this.log(`  ⏱️  Average Duration: ${avgDuration}ms`, 'dim');
    this.log('═════════════════════════════════════════', 'blue');

    await this.pause();
  }

  async exportHistory() {
    this.printBanner();
    this.log('💾 Export History', 'yellow');
    console.log();

    if (this.history.length === 0) {
      this.warning('No history to export!');
      await this.pause();
      return;
    }

    const filename = await this.question('Export filename [default: history-export.json]: ') || 'history-export.json';
    
    try {
      await fs.writeFile(filename, JSON.stringify(this.history, null, 2));
      this.success(`History exported to ${filename}`);
    } catch (error) {
      this.error(`Failed to export: ${error.message}`);
    }

    await this.pause();
  }

  async about() {
    this.printBanner();
    this.log('ℹ️  About NVCH Reactor CLI', 'yellow');
    console.log();

    const pkg = getPackageInfo();
    
    this.log('═════════════════════════════════════════', 'blue');
    this.log(`  Package: ${pkg.name}`, 'white');
    this.log(`  Version: ${pkg.version}`, 'white');
    console.log();
    this.log('  Description:', 'cyan');
    this.log('  Interactive CLI tool for automating', 'white');
    this.log('  WhatsApp Channel reactions', 'white');
    console.log();
    this.log('  Features:', 'cyan');
    this.log('  • Single & Batch reactions', 'white');
    this.log('  • File import support', 'white');
    this.log('  • History tracking', 'white');
    this.log('  • Statistics & Analytics', 'white');
    this.log('  • URL validation', 'white');
    console.log();
    this.log('  © 2025 Nine', 'dim');
    this.log('═════════════════════════════════════════', 'blue');

    await this.pause();
  }

  async run() {
    await this.loadConfig();
    await this.loadHistory();

    if (!this.config.apiKey) {
      await this.setupApiKey();
      if (!this.config.apiKey) {
        this.error('Cannot continue without API Key!');
        rl.close();
        return;
      }
    }

    while (true) {
      this.printBanner();
      
      if (this.config.apiKey) {
        this.log(`🔑 API Key: ***${this.config.apiKey.slice(-4)}`, 'dim');
      }
      
      this.printMenu();

      const choice = await this.question('Select option: ');

      switch (choice) {
        case '1':
          await this.sendSingleReaction();
          break;
        case '2':
          await this.sendBatchReactions();
          break;
        case '3':
          await this.loadFromFile();
          break;
        case '4':
          await this.validateUrlMenu();
          break;
        case '5':
          await this.viewHistory();
          break;
        case '6':
          await this.clearHistory();
          break;
        case '7':
          await this.settings();
          break;
        case '8':
          await this.statistics();
          break;
        case '9':
          await this.exportHistory();
          break;
        case '10':
          await this.about();
          break;
        case '0':
          this.clearScreen();
          this.log('👋 Thank you for using NVCH Reactor CLI!', 'cyan');
          this.log('See you next time! 🚀', 'bright');
          console.log();
          rl.close();
          return;
        default:
          this.error('Invalid option!');
          await this.pause();
      }
    }
  }
}

// Start the CLI
const cli = new NVCHCLI();
cli.run().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

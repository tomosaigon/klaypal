
import fs from 'fs';
import { ethers } from 'ethers';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Open (or/and initialize) the database
async function initializeDatabase(): Promise<Database> {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Create the users table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      ethereum_address TEXT NOT NULL
    )
  `);

  return db;
}

// Generate secret key if necessary
function ensureSecretFile(): void {
  const secretFilePath = './secret';

  if (!fs.existsSync(secretFilePath)) {
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;

    fs.writeFileSync(secretFilePath, privateKey, { encoding: 'utf-8' });
    console.log(`Generated new Ethereum key pair. Public address: ${address}`);
    process.exit(0);
  }
}

// Function to read the bot token from the file
function readBotToken(): string {
  try {
    return fs.readFileSync('./bot_token.txt', 'utf-8').trim();
  } catch (error) {
    console.error('Failed to read bot token from file:', error);
    process.exit(1);
  }
}

// Main function to run the bot and handle commands
async function main() {
  ensureSecretFile();

  const privateKey = fs.readFileSync('./secret', 'utf-8');
  const wallet = new ethers.Wallet(privateKey);
  const token = readBotToken();
  const db = await initializeDatabase();
  const bot = new TelegramBot(token, { polling: true });

  // Command to register Ethereum address
  bot.onText(/\/register (.+)/, async (msg, match) => {
    if (!match) return;

    const chatId = msg.chat.id;
    const ethereumAddress = match[1].trim();

    try {
      // Store the user's Ethereum address in the database
      await db.run(`
        INSERT INTO users (telegram_id, ethereum_address) VALUES (?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET ethereum_address=excluded.ethereum_address
      `, [chatId, ethereumAddress]);

      bot.sendMessage(chatId, 'Your Ethereum address has been registered successfully.');
    } catch (error) {
      console.error('Error storing Ethereum address:', error);
      bot.sendMessage(chatId, 'There was an error registering your Ethereum address. Please try again later.');
    }
  });

  // Command to show the registered Ethereum address
  bot.onText(/\/showaddress/, async (msg) => {
    const chatId = msg.chat.id;

    try {
      // Fetch the user's Ethereum address from the database
      const row = await db.get('SELECT ethereum_address FROM users WHERE telegram_id = ?', chatId);

      if (row && row.ethereum_address) {
        bot.sendMessage(chatId, `Your registered Ethereum address is: ${row.ethereum_address}`);
      } else {
        bot.sendMessage(chatId, 'You do not have a registered Ethereum address. Use /register <your_address> to register.');
      }
    } catch (error) {
      console.error('Error fetching Ethereum address:', error);
      bot.sendMessage(chatId, 'There was an error fetching your Ethereum address. Please try again later.');
    }
  });

  const domain = {
    name: 'TelegramBotVault',
    version: '1',
    chainId: 1001, // Klaytn Baobab
    // verifyingContract: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // hh
    verifyingContract: '0xc4eD1724823147f891c8B981F5983Ce5fbA791ae', // baobab
  };

  const types = {
    Transfer: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  };
  bot.onText(/\/approve (.+) (.+) (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return;

    const chatId = msg.chat.id;
    const recipient = match[1].trim();
    const amount = ethers.utils.parseEther(match[2].trim());
    const nonce = parseInt(match[3].trim(), 10);

    try {
      // Fetch the user's Ethereum address from the database
      const row = await db.get('SELECT ethereum_address FROM users WHERE telegram_id = ?', chatId);

      if (row && row.ethereum_address) {
        const sender = row.ethereum_address;

        const message = {
          sender,
          recipient,
          amount,
          nonce
        };
        const signature = await wallet._signTypedData(domain, types, message);

        bot.sendMessage(chatId, `Message: ${JSON.stringify(message)}\nSignature: ${signature}`);
      } else {
        bot.sendMessage(chatId, 'You do not have a registered Ethereum address. Use /register <your_address> to register.');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      bot.sendMessage(chatId, 'There was an error approving the transaction. Please try again later.');
    }
  });

  console.log('Bot is running...');
}

main().catch(err => console.error('Failed to start bot:', err));

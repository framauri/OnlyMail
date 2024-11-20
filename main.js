const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');

const app = express(); // Define the Express app
const port = 3000;

const imapConfig = {
  user: 'francesco.mauri@itsrizzoli.it',
  password: 'lgkwmdsxafokhpcr', // Use app password if 2FA is enabled
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false,  // Disable certificate verification
  },
};
const fetchUnreadEmails = () =>
    new Promise((resolve, reject) => {
      const imap = new Imap(imapConfig);
  
      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error('Error opening inbox:', err);
            return reject(err);
          }
  
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              console.error('Error searching emails:', err);
              return reject(err);
            }
  
            if (results.length === 0) {
              console.log('No unread emails found.');
              imap.end();
              return resolve([]);
            }
  
            const fetch = imap.fetch(results, { bodies: '' });
            const emails = [];
  
            fetch.on('message', (msg) => {
              let emailBuffer = '';
  
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  emailBuffer += chunk.toString('utf8');
                });
  
                stream.on('end', async () => {
                  try {
                    const email = await simpleParser(emailBuffer);
                    emails.push({
                      subject: email.subject,
                      from: email.from.text,
                      date: email.date,
                      body: email.text,
                    });
                  } catch (parseError) {
                    console.error('Error parsing email:', parseError);
                  }
                });
              });
            });
  
            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
  
            fetch.once('error', (fetchError) => {
              console.error('Error during fetch:', fetchError);
              reject(fetchError);
            });
          });
        });
      });
  
      imap.once('error', (imapError) => {
        console.error('IMAP connection error:', imapError);
        reject(imapError);
      });
  
      imap.once('end', () => console.log('IMAP connection closed.'));
      imap.connect();
    });  
  
  // Middleware
  app.use(cors());
  
  // Route to fetch unread emails
  app.get('/emails', async (req, res) => {
    try {
      const emails = await fetchUnreadEmails();
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).send('Failed to fetch emails.');
    }
  });
  
  // Start the server
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
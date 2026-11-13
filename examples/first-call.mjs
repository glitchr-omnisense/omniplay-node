import { mint, verify } from '@omniplay/node';

// A ticket the PHP application signed (omnisense/omniplay's Tickets, recorded in its vectors):
const fromPhp = 'eyJzdWIiOiJwbGF5ZXItNDIiLCJuYW1lIjoiQWRhIiwicm9vbSI6ImV1LTEtYTNmOSIsImV4cCI6NDEwMjQ0NDgwMH0.0bb9f63e3f6c9d7237c18855738470bae0f54410d4d1177ee87cc65c4608a57c';
const secret = 's3cr3t-shared-with-the-servers';   // OMNIPLAY_TICKET_SECRET on a real server
console.log(verify(fromPhp, secret, 'eu-1-a3f9')?.sub);   // "player-42": the server eu-1-a3f9 lets the player in
console.log(verify(fromPhp, secret, 'eu-1-b7c2'));        // null: another server refuses it

const ticket = mint({ secret, room: 'eu-1-a3f9', ttl: 60, claims: { sub: 'player-7' } });
console.log(verify(ticket.token, secret, 'eu-1-a3f9')?.sub);   // "player-7"

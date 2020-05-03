const WebSocket = require('ws');

const port = 8181;

module.exports.createServer = ctrl => {
  const wss = new WebSocket.Server({ port });

  wss.broadcast = (data, condition) => {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }

    if (!condition) {
      condition = () => true;
    }

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        if (condition(client, data)) client.send(data);
      }
    });
  };

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    ws.ip = ip;

    ws.send(JSON.stringify(ctrl.onConnect(ip)));

    ws.on('message', message => {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'vote-cast':
          if (!ctrl.isVotingOpen()) return;
          ctrl.recordVote(data, ip);
          // broadcast vote table to everyone who has already voted
          wss.broadcast(ctrl.getVoteResults(), client => {
            return Boolean(ctrl.voteState.votes[client.ip]);
          });
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
    });
  });

  wss.on('error', err => {
    console.log('websocket error:', err);
  });

  return wss;
};

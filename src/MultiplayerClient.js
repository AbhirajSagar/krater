/**
 * MultiplayerClient.js
 * Universal client SDK for generic multiplayer backend deployed at:
 * https://multiplayer-game-backend-zozw.onrender.com/
 */

export const DEFAULT_SERVER_HTTP = 'https://multiplayer-game-backend-zozw.onrender.com';
export const DEFAULT_SERVER_WS = 'wss://multiplayer-game-backend-zozw.onrender.com/ws';

export class MultiplayerClient {
  constructor({
    wsUrl = DEFAULT_SERVER_WS,
    httpUrl = DEFAULT_SERVER_HTTP,
    autoReconnect = true,
  } = {}) {
    this.wsUrl = wsUrl;
    this.httpUrl = httpUrl;
    this.autoReconnect = autoReconnect;

    this.ws = null;
    this.listeners = new Map();
    this.pendingRequests = new Map();

    this.playerId = null;
    this.reconnectToken = null;
    this.room = null;
    this.isConnected = false;
    this.pingMs = 0;

    this._reqCounter = 0;
    this._pingTimer = null;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`[MultiplayerClient] Error in listener for ${event}:`, err);
        }
      }
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        return resolve();
      }

      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (err) {
        return reject(err);
      }

      let opened = false;

      this.ws.onopen = () => {
        opened = true;
        this.isConnected = true;
        this.emit('connected');
        this.startHeartbeat();
        resolve();
      };

      this.ws.onclose = (event) => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason, wasConnected });

        for (const [, { reject: rej }] of this.pendingRequests.entries()) {
          rej(new Error('Connection closed before response received'));
        }
        this.pendingRequests.clear();
      };

      this.ws.onerror = (err) => {
        if (!opened) {
          reject(err);
        }
        this.emit('error', err);
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };
    });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this._pingTimer = setInterval(async () => {
      if (this.isConnected) {
        const start = performance.now();
        try {
          await this.ping();
          this.pingMs = Math.round(performance.now() - start);
          this.emit('ping', this.pingMs);
        } catch {
          // ignore transient ping timeouts
        }
      }
    }, 12000); // 12 seconds keeps Render's WebSocket proxy warmly active
  }

  stopHeartbeat() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  request(type, payload = {}, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        return reject(new Error('WebSocket is not connected'));
      }

      const requestId = `req_${++this._reqCounter}_${Date.now()}`;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timed out after ${timeoutMs}ms for ${type}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      const msg = {
        type,
        payload,
        requestId,
      };

      this.ws.send(JSON.stringify(msg));
    });
  }

  send(type, payload = {}) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { type, payload, requestId, error } = msg;

    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject, timer } = this.pendingRequests.get(requestId);
      clearTimeout(timer);
      this.pendingRequests.delete(requestId);

      if (type === 'ERROR' || error) {
        return reject(new Error(error?.message || 'Server error'));
      }
      return resolve(payload);
    }

    switch (type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
        this.room = payload.room;
        this.playerId = payload.player.id;
        this.reconnectToken = payload.player.reconnectToken;
        this.saveSession();
        this.emit(type === 'ROOM_CREATED' ? 'roomCreated' : 'roomJoined', payload);
        break;

      case 'ROOM_LEFT':
        this.room = null;
        this.clearSavedSession();
        this.emit('roomLeft');
        break;

      case 'PLAYER_JOINED':
        if (this.room) {
          if (payload.player.role === 'spectator') {
            this.room.spectators = this.room.spectators || [];
            this.room.spectators.push(payload.player);
          } else {
            this.room.players = this.room.players || [];
            // Prevent duplicate entries
            const exists = this.room.players.some(p => p.id === payload.player.id);
            if (!exists) {
              this.room.players.push(payload.player);
            }
          }
        }
        this.emit('playerJoined', payload.player);
        break;

      case 'PLAYER_LEFT':
        if (this.room) {
          this.room.players = (this.room.players || []).filter(p => p.id !== payload.playerId);
          this.room.spectators = (this.room.spectators || []).filter(s => s.id !== payload.playerId);
          if (payload.newHostId) {
            this.room.hostId = payload.newHostId;
          }
        }
        this.emit('playerLeft', payload);
        break;

      case 'PLAYER_DISCONNECTED':
        if (this.room) {
          const player = (this.room.players || []).find(p => p.id === payload.playerId);
          if (player) player.isDisconnected = true;
        }
        this.emit('playerDisconnected', payload);
        break;

      case 'PLAYER_RECONNECTED':
        if (this.room) {
          const player = (this.room.players || []).find(p => p.id === payload.playerId);
          if (player) player.isDisconnected = false;
        }
        this.emit('playerReconnected', payload);
        break;

      case 'PLAYER_KICKED':
        this.room = null;
        this.clearSavedSession();
        this.emit('kicked', payload.reason);
        break;

      case 'PLAYER_READY_CHANGED':
        if (this.room) {
          const player = (this.room.players || []).find(p => p.id === payload.playerId);
          if (player) player.ready = payload.ready;
        }
        this.emit('playerReadyChanged', payload);
        break;

      case 'HOST_CHANGED':
        if (this.room) {
          this.room.hostId = payload.newHostId;
        }
        this.emit('hostChanged', payload);
        break;

      case 'ROOM_SETTINGS_UPDATED':
        if (this.room) {
          Object.assign(this.room, payload);
        }
        this.emit('roomSettingsUpdated', payload);
        break;

      case 'GAME_STARTED':
        if (this.room) {
          this.room.status = payload.status;
          this.room.isLocked = payload.isLocked;
        }
        this.emit('gameStarted', payload);
        break;

      case 'GAME_ENDED':
        if (this.room) {
          this.room.status = payload.status;
        }
        this.emit('gameEnded', payload);
        break;

      case 'ROOM_LOCKED':
        if (this.room) {
          this.room.isLocked = payload.isLocked;
        }
        this.emit('roomLocked', payload);
        break;

      case 'ROOM_STATE_UPDATED':
        if (this.room) {
          this.room.state = payload.state;
        }
        this.emit('roomStateUpdated', payload);
        break;

      case 'PLAYER_STATE_UPDATED':
        if (this.room) {
          const player = (this.room.players || []).find(p => p.id === payload.playerId);
          if (player) {
            player.state = payload.state;
          }
        }
        this.emit('playerStateUpdated', payload);
        break;

      case 'RELAY_MESSAGE':
        this.emit('relay', payload.event, payload.data, payload.senderId, payload);
        this.emit(`relay:${payload.event}`, payload.data, payload.senderId, payload);
        break;

      case 'ERROR':
        this.emit('error', error);
        break;
    }
  }

  // --- Session Management ---
  saveSession() {
    if (typeof sessionStorage === 'undefined') return;
    try {
      if (this.room && this.playerId && this.reconnectToken) {
        sessionStorage.setItem('spacegame_session', JSON.stringify({
          roomId: this.room.id,
          roomCode: this.room.code,
          playerId: this.playerId,
          reconnectToken: this.reconnectToken,
          timestamp: Date.now()
        }));
      }
    } catch {
      // ignore
    }
  }

  getSavedSession() {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('spacegame_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Valid for 30 minutes
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        return data;
      }
      this.clearSavedSession();
      return null;
    } catch {
      return null;
    }
  }

  clearSavedSession() {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.removeItem('spacegame_session');
    } catch {
      // ignore
    }
  }

  // --- API Actions ---
  async createRoom(options = {}) {
    const res = await this.request('CREATE_ROOM', {
      gameType: 'spacebattle',
      maxPlayers: 8,
      ...options,
    });
    this.room = res.room;
    this.playerId = res.player.id;
    this.reconnectToken = res.player.reconnectToken;
    this.saveSession();
    return res;
  }

  async joinRoom(options = {}) {
    const res = await this.request('JOIN_ROOM', options);
    this.room = res.room;
    this.playerId = res.player.id;
    this.reconnectToken = res.player.reconnectToken;
    this.saveSession();
    return res;
  }

  async quickJoin(options = {}) {
    const res = await this.request('QUICK_JOIN', {
      gameType: 'spacebattle',
      createIfNotFound: true,
      roomOptions: {
        name: 'Open Sector Dogfight',
        maxPlayers: 8,
        gameType: 'spacebattle'
      },
      ...options,
    });
    this.room = res.room;
    this.playerId = res.player.id;
    this.reconnectToken = res.player.reconnectToken;
    this.saveSession();
    return res;
  }

  async reconnect(roomId, playerId, reconnectToken) {
    const res = await this.request('RECONNECT', {
      roomId,
      playerId,
      reconnectToken,
    });
    this.room = res.room;
    this.playerId = res.player.id;
    this.reconnectToken = res.player.reconnectToken;
    this.saveSession();
    return res;
  }

  async leaveRoom() {
    try {
      const res = await this.request('LEAVE_ROOM');
      this.room = null;
      this.clearSavedSession();
      return res;
    } catch (e) {
      this.room = null;
      this.clearSavedSession();
      return { success: true };
    }
  }

  async setReady(ready = true) {
    return this.request('SET_READY', { ready });
  }

  async updateRoomState(patch) {
    return this.request('UPDATE_ROOM_STATE', { patch });
  }

  async updatePlayerState(patch) {
    return this.request('UPDATE_PLAYER_STATE', { patch });
  }

  relay(event, data, target = 'others') {
    this.send('RELAY', { event, data, target });
  }

  async startGame(options = {}) {
    return this.request('START_GAME', options);
  }

  async endGame(options = {}) {
    return this.request('END_GAME', options);
  }

  async lockRoom() {
    return this.request('LOCK_ROOM');
  }

  async unlockRoom() {
    return this.request('UNLOCK_ROOM');
  }

  async kickPlayer(playerId, reason = 'Kicked by host') {
    return this.request('KICK_PLAYER', { playerId, reason });
  }

  async transferHost(playerId) {
    return this.request('TRANSFER_HOST', { playerId });
  }

  async updateRoomSettings(settings) {
    return this.request('UPDATE_ROOM_SETTINGS', settings);
  }

  async ping() {
    return this.request('PING', { timestamp: Date.now() });
  }

  // --- REST Helpers ---
  async fetchPublicRooms({ gameType = 'spacebattle', search = '' } = {}) {
    try {
      const params = new URLSearchParams();
      if (gameType) params.append('gameType', gameType);
      if (search) params.append('search', search);

      const url = `${this.httpUrl}/api/rooms${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.rooms || [];
    } catch (err) {
      console.warn('[MultiplayerClient] Failed to fetch rooms from REST API:', err);
      return [];
    }
  }

  async checkServerHealth() {
    try {
      const res = await fetch(`${this.httpUrl}/health`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}

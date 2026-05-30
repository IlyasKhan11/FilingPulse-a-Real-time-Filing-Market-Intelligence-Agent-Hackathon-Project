import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow connections from Vite frontend running on any port
  },
})
export class AlertGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AlertGateway.name);

  @WebSocketServer() 
  server: Server;

  afterInit(server: Server) {
    this.logger.log('Socket.io Realtime Gateway Initialized successfully.');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Frontend client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts a structured alert payload to all active connected clients.
   */
  broadcastAlert(alert: any) {
    this.logger.log(`Broadcasting alert to clients: ${alert.title} [${alert.severity}]`);
    if (this.server) {
      this.server.emit('alert', alert);
    } else {
      this.logger.error('WebSocket Server is not ready yet. Cannot emit alert.');
    }
  }
}

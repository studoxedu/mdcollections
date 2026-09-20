import { EventType } from "../types/domain";
export interface IncomingEvent {
  event_id: string;
  server_sequence: number;
  event_type: EventType;
  entity_id: string;
  payload: Record<string, unknown>;
  business_id: string;
  device_id: string;
  user_id: string;
  client_created_at: string;
}

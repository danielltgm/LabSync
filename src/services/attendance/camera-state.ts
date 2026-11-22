export type CameraPermissionLike = {
  granted: boolean;
  canAskAgain: boolean;
} | null;

export type CameraGateState =
  | 'web-unsupported'
  | 'idle'
  | 'prompt'
  | 'denied-retryable'
  | 'denied-settings'
  | 'paused'
  | 'active';

export interface CameraGateInput {
  platform: string;
  scanRequested: boolean;
  permission: CameraPermissionLike;
  isScreenActive: boolean;
}

export function resolveCameraGateState(input: CameraGateInput): CameraGateState {
  if (input.platform === 'web') return 'web-unsupported';
  if (!input.scanRequested) return 'idle';
  if (!input.permission) return 'prompt';
  if (!input.permission.granted) {
    return input.permission.canAskAgain ? 'denied-retryable' : 'denied-settings';
  }
  return input.isScreenActive ? 'active' : 'paused';
}

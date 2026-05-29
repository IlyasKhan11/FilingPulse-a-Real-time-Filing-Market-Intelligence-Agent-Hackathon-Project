import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class DetectionService {
  private snapshots = new Map<string, string>();

  isChanged(snapshotId: string, textDiff: string): boolean {
    const newHash = crypto.createHash('sha256').update(textDiff).digest('hex');
    const oldHash = this.snapshots.get(snapshotId);

    if (oldHash === newHash) {
      console.log(`No change detected for ${snapshotId} — discarding`);
      return false;
    }

    this.snapshots.set(snapshotId, newHash);
    return true;
  }

  isMaterial(textDiff: string): boolean {
    const diff = textDiff.trim();

    if (diff.length < 50) {
      console.log('Diff too small — likely cosmetic, discarding');
      return false;
    }

    const cosmetic = [
      /^\s+$/,
      /<nav.*?<\/nav>/gs,
      /<footer.*?<\/footer>/gs,
      /<script.*?<\/script>/gs,
    ];

    for (const pattern of cosmetic) {
      if (pattern.test(diff)) {
        console.log('Cosmetic change detected — discarding');
        return false;
      }
    }

    return true;
  }
}
import { WorkspaceItem } from './workspace-item.js';

export class Folder extends WorkspaceItem {
  constructor(userId, name, parentFolderId) {
    super(userId, name, parentFolderId);
  }

  static create(userId, name, parentFolderId = null) {
    return new Folder(userId, name, parentFolderId);
  }
}

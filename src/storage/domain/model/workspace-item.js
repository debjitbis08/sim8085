import { v7 as uuidv7 } from 'uuid';

export class WorkspaceItem {
  itemId;
  name;
  parentFolderId;
  userId;

  constructor(userId, name, parentFolderId, itemId = uuidv7()) {
    this.userId = userId;
    this.itemId = itemId;
    this.name = name;
    this.parentFolderId = parentFolderId;
  }
}

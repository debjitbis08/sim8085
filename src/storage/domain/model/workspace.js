import { Folder } from './folder.js';

/**
 This is the aggregate root of the storage bounded context.
 */
export class Workspace {
  userId;
  homeFolderId;

  constructor(userId, homeFolderId) {
    this.userId = userId;
    this.homeFolderId = homeFolderId;
  }

  static newForUser(
    userId,
    workspaceRepository
  ) {
    const existingWorkspace = workspaceRepository.getForUser(userId);

    if (existingWorkspace) return;

    const homeFolder = Folder.create(userId, "Home");

    const workspace = new Workspace(userId, homeFolder.id);

    workspaceRepository.saveNewWorkspace(workspace);

    // Publish event if communicating with other contexts, later.

    return workspace;
  }

}

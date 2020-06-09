// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See the @microsoft/rush package's LICENSE file for license information.

// THIS SCRIPT IS GENERATED BY THE "rush deploy" COMMAND.

import * as fs from 'fs';
import * as path from 'path';
import { /* type */ IDeployMetadataJson } from '../logic/deploy/DeployManager';
import { /* type */ IFileSystemCreateLinkOptions } from '@rushstack/node-core-library';

// API borrowed from @rushstack/node-core-library, since this script avoids using any
// NPM dependencies.
class FileSystem {
  public static createSymbolicLinkJunction(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'junction');
  }

  public static createSymbolicLinkFile(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'file');
  }

  public static createSymbolicLinkFolder(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'dir');
  }

  public static createHardLink(options: IFileSystemCreateLinkOptions): void {
    fs.linkSync(options.linkTargetPath, options.newLinkPath);
  }
}

function ensureFolder(folderPath: string): void {
  if (!folderPath) {
    return;
  }
  if (fs.existsSync(folderPath)) {
    return;
  }
  const parentPath: string = path.dirname(folderPath);
  if (parentPath && parentPath !== folderPath) {
    ensureFolder(parentPath);
  }
  fs.mkdirSync(folderPath);
}

function removeLinks(targetSubdeploymentFolder: string, deployMetadataObject: IDeployMetadataJson): void {
  for (const linkInfo of deployMetadataObject.links) {
    // Link to the relative path for symlinks
    const newLinkPath: string = path.join(targetSubdeploymentFolder, linkInfo.linkPath);
    if (fs.existsSync(newLinkPath)) {
      fs.unlinkSync(newLinkPath);
    }
  }
}

function createLinks(targetSubdeploymentFolder: string, deployMetadataObject: IDeployMetadataJson): void {
  for (const linkInfo of deployMetadataObject.links) {
    // Link to the relative path for symlinks
    const newLinkPath: string = path.join(targetSubdeploymentFolder, linkInfo.linkPath);
    const linkTargetPath: string = path.join(targetSubdeploymentFolder, linkInfo.targetPath);

    // Make sure the containing folder exists
    ensureFolder(path.dirname(newLinkPath));

    // NOTE: This logic is based on NpmLinkManager._createSymlink()
    if (process.platform === 'win32') {
      if (linkInfo.kind === 'folderLink') {
        // For directories, we use a Windows "junction".  On Unix, this produces a regular symlink.
        FileSystem.createSymbolicLinkJunction({ newLinkPath, linkTargetPath });
      } else {
        // For files, we use a Windows "hard link", because creating a symbolic link requires
        // administrator permission.

        // NOTE: We cannot use the relative path for hard links
        FileSystem.createHardLink({ newLinkPath, linkTargetPath });
      }
    } else {
      // However hard links seem to cause build failures on Mac, so for all other operating systems
      // we use symbolic links for this case.
      if (linkInfo.kind === 'folderLink') {
        FileSystem.createSymbolicLinkFolder({ newLinkPath, linkTargetPath });
      } else {
        FileSystem.createSymbolicLinkFile({ newLinkPath, linkTargetPath });
      }
    }
  }
}

function showUsage(): void {
  console.log('Usage:');
  console.log('  node create-links.js create');
  console.log('  node create-links.js remove');

  console.log('\nCreates or removes the symlinks for a deployment folder created by "rush deploy".');
  console.log('The link information is read from "deploy-metadata.json" in the same folder.');
}

function main(): boolean {
  // Example: [ "node.exe", "create-links.js", ""create" ]
  const args: string[] = process.argv.slice(2);

  if (args.length !== 1 || (args[0] !== 'create' && args[0] !== 'remove')) {
    showUsage();
    return false;
  }

  const targetSubdeploymentFolder: string = __dirname;
  const deployMetadataPath: string = path.join(targetSubdeploymentFolder, 'deploy-metadata.json');

  if (!fs.existsSync(deployMetadataPath)) {
    throw new Error('Input file not found: ' + deployMetadataPath);
  }

  const deployMetadataJson: string = fs.readFileSync(deployMetadataPath).toString();
  const deployMetadataObject: IDeployMetadataJson = JSON.parse(deployMetadataJson);

  if (args[0] === 'create') {
    console.log(`\nCreating links for deployment scenario "${deployMetadataObject.scenarioName}"`);
    removeLinks(targetSubdeploymentFolder, deployMetadataObject);
    createLinks(targetSubdeploymentFolder, deployMetadataObject);
  } else {
    console.log(`\nRemoving links for deployment scenario "${deployMetadataObject.scenarioName}"`);
    removeLinks(targetSubdeploymentFolder, deployMetadataObject);
  }

  console.log('The operation completed successfully.');
  return true;
}

try {
  process.exitCode = 1;
  if (main()) {
    process.exitCode = 0;
  }
} catch (error) {
  console.log('ERROR: ' + error);
}

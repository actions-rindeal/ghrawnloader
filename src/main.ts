import * as core from '@actions/core';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

interface Inputs {
  githubToken: string;
  repo: string;
  ref: string;
  pre: boolean;
  files: string[];
  outputDirectory: string;
}

interface FileConfig {
  org: string;
  repo: string;
  ref: string;
  srcPath: string;
  destPath: string;
  permissions?: number;
}

interface FileMetadata {
  srcPath: string;
  destPath: string;
  repo: string;
  ref: string;
  size: number;
  humanSize: string;
  sha256: string;
  timeTaken: number;
}

const validateInput = (input: string, regex: RegExp, errorMessage: string): string => {
  if (!regex.test(input)) {
    throw new Error(errorMessage);
  }
  return input;
};

const parseFileConfig = (file: string, defaultOrg: string, defaultRepo: string, defaultRef: string): FileConfig => {
  const [source, destination = ''] = file.split('=>').map(s => s.trim());
  const [repoPath, srcPath] = source.split(':').map(s => s.trim());

  const [orgRepo, fileRef] = repoPath.split('@');
  const [org, repo] = orgRepo.split('/');

  const destParts = destination.split('=>');
  const destPath = destParts[0].trim();
  const permissionsStr = destParts[1]?.trim();

  const permissions = permissionsStr ? parseInt(permissionsStr, 8) : undefined;

  return {
    org: validateInput(org || defaultOrg, /^[a-zA-Z0-9-]+$/, 'Invalid organization name'),
    repo: validateInput(repo || defaultRepo, /^[a-zA-Z0-9-_.]+$/, 'Invalid repository name'),
    ref: validateInput(fileRef || defaultRef, /^[a-zA-Z0-9-_.\/]+$/, 'Invalid reference'),
    srcPath: validateInput(srcPath, /^[a-zA-Z0-9-_./]+$/, 'Invalid source path'),
    destPath: validateInput(destPath || srcPath, /^[a-zA-Z0-9-_./~${}]+$/, 'Invalid destination path'),
    permissions
  };
};

const expandPath = (path: string): string => {
  let expanded = path;
  if (expanded.startsWith('~')) {
    expanded = expanded.replace(/^~/, os.homedir());
  }
  return expanded.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, envVar) => process.env[envVar] || '');
};

const downloadFile = (fileConfig: FileConfig, outputDir: string, token: string): Promise<FileMetadata> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const url = `https://raw.githubusercontent.com/${fileConfig.org}/${fileConfig.repo}/${fileConfig.ref}/${fileConfig.srcPath}`;
    const fullDestPath = path.join(outputDir, expandPath(fileConfig.destPath));

    core.debug(`URL: ${url}`);
    core.debug(`Destination: ${fullDestPath}`);

    const options: https.RequestOptions = {
      headers: token ? { Authorization: `token ${token}` } : {}
    };

    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(fullDestPath);
      const hash = crypto.createHash('sha256');
      let size = 0;
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk) => {
        size += chunk.length;
        hash.update(chunk);
        fileStream.write(chunk);

        const percent = totalSize ? Math.round((size / totalSize) * 100) : 'unknown';
        core.debug(`Received ${chunk.length} bytes for ${url} (${size}/${totalSize} bytes, ${percent}%)`);
      });

      response.on('end', async () => {
        fileStream.end();

        if (fileConfig.permissions !== undefined) {
          await fs.promises.chmod(fullDestPath, fileConfig.permissions);
        }

        const endTime = Date.now();
        const timeTaken = endTime - startTime;
        const sha256 = hash.digest('hex');
        const humanSize = formatBytes(size);

        const metadata: FileMetadata = {
          srcPath: fileConfig.srcPath,
          destPath: fullDestPath,
          repo: `${fileConfig.org}/${fileConfig.repo}`,
          ref: fileConfig.ref,
          size,
          humanSize,
          sha256,
          timeTaken
        };

        core.debug(`File: ${metadata.srcPath}`);
        core.debug(`Repo: ${metadata.repo}`);
        core.debug(`Ref: ${metadata.ref}`);
        core.debug(`Destination: ${metadata.destPath}`);
        core.debug(`Size: ${metadata.size} bytes (${metadata.humanSize})`);
        core.debug(`SHA256: ${metadata.sha256}`);
        core.debug(`Time taken: ${metadata.timeTaken}ms`);

        resolve(metadata);
      });
    }).on('error', reject);
  });
};

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const run = async (): Promise<void> => {
  try {
    const inputs: Inputs = {
      githubToken: core.getInput('github-token'),
      repo: core.getInput('repo'),
      ref: core.getInput('ref'),
      pre: core.getBooleanInput('pre'),
      files: core.getMultilineInput('files'),
      outputDirectory: core.getInput('output-directory')
    };

    const [defaultOrg, defaultRepo] = inputs.repo.split('/');

    const fileConfigs = inputs.files.map(file => parseFileConfig(file, defaultOrg, defaultRepo, inputs.ref));

    const metadataResults = await Promise.all(fileConfigs.map(config => 
      downloadFile(config, inputs.outputDirectory, inputs.githubToken)
    ));

    core.setOutput('metadata', JSON.stringify(metadataResults));

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
};

if (require.main === module) {
  run();
}

export default run;

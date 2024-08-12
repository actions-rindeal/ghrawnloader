# 🚀 GitHub Raw Downloader Action

![Alpha](https://img.shields.io/badge/status-alpha-blue)
[![GitHub license](https://img.shields.io/github/license/actions-rindeal/ghrawnloader)](https://github.com/actions-rindeal/ghrawnloader/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/actions-rindeal/ghrawnloader)](https://github.com/actions-rindeal/ghrawnloader/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/actions-rindeal/ghrawnloader)](https://github.com/actions-rindeal/ghrawnloader/issues)

Supercharge your workflow with the GitHub Raw Downloader Action! 💪 Download files from any GitHub repository with ease and flexibility. Whether you're fetching configuration files, scripts, or any other assets, this action has got you covered. 🎯

## ✨ Features

- 📥 Download files from any GitHub repository
- 🔐 Support for private repositories with token authentication
- 🔀 Flexible file path mapping
- 🧩 Environment variable expansion in paths
- 📊 Detailed metadata output for each downloaded file
- 🚦 Progress tracking with debug messages

## 📋 Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `github-token` | GitHub token for accessing private repositories | No | `${{ github.token }}` |
| `repo` | Repository to download from (org/repo) | No | `${{ github.repository }}` |
| `ref` | Git reference (branch, tag, or commit SHA) | No | `master` |
| `pre` | Whether to run in pre action phase | No | `false` |
| `files` | Files to download (multi-line string) | Yes | N/A |
| `output-directory` | Directory to store downloaded files | No | `.` |

## 📤 Outputs

| Name | Description |
|------|-------------|
| `metadata` | JSON string containing metadata for all downloaded files |

## 🚀 Usage

Here's an example of how to use the GitHub Raw Downloader Action in your workflow:

```yaml
steps:
  - name: Download files from GitHub raw
    uses: your-username/ghrawnloader@v1
    id: downloader
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      repo: octocat/Hello-World
      ref: main
      files: |
        README.md => docs/README.md
        src/app.js => app.js
        config/${ENV_NAME}.json => config.json
      output-directory: downloaded-files

  - name: Use downloaded files
    run: |
      cat downloaded-files/docs/README.md
      node downloaded-files/app.js

  - name: Use metadata
    run: |
      echo 'Metadata: ${{ steps.downloader.outputs.metadata }}'
      # Parse and use the metadata as needed
```

## 📊 Metadata Output

The action provides detailed metadata for each downloaded file. Here's an example of the metadata output format:

```json
[
  {
    "srcPath": "README.md",
    "destPath": "/path/to/downloaded-files/docs/README.md",
    "repo": "octocat/Hello-World",
    "ref": "main",
    "size": 1234,
    "humanSize": "1.23 KB",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "timeTaken": 42
  },
  {
    "srcPath": "src/app.js",
    "destPath": "/path/to/downloaded-files/app.js",
    "repo": "octocat/Hello-World",
    "ref": "main",
    "size": 5678,
    "humanSize": "5.68 KB",
    "sha256": "7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730",
    "timeTaken": 78
  }
]
```

## 🎨 Advanced Usage

### 🔀 File Path Mapping

You can use advanced file path mapping in the `files` input:

```yaml
files: |
  org/repo@ref : source/path.txt => destination/path.txt
  : config.json => ${HOME}/config.json
  @develop : scripts/build.sh => ~/scripts/build.sh => 755
```

- Specify a different repo and ref for each file
- Use environment variable expansion in destination paths
- Set file permissions (octal) after the destination path

### 🔐 Private Repositories

To access private repositories, make sure to provide a valid `github-token` with appropriate permissions.

## 🤝 Contributing

I welcome contributions!

## 📜 License

This project is licensed under the GPL 3.0 License - see the [LICENSE](LICENSE) file for details.

## 🌟 Show your support

Give a ⭐️ if this project helped you!

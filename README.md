# Publish Symbols Action

Use this Action to publish symbols to the Azure DevOps Package Management symbol server (Artifacts server). Symbol servers enables your debugger to automatically retrieve the correct symbol files without knowing product names, build numbers or package names.

[![pr-check](https://github.com/microsoft/action-publish-symbols/actions/workflows/pr-check.yml/badge.svg)](https://github.com/microsoft/action-publish-symbols/actions/workflows/pr-check.yml)

# Usage

See [action.yml](action.yml)

Example Usage from a repository containing .NET Core code:
```yaml
 steps:
    - uses: actions/checkout@v3
    - name: Setup .NET Core
      uses: actions/setup-dotnet@v2
      with:
        dotnet-version: 5.0.102
    - name: Install dependencies
      working-directory: './src'
      run: dotnet restore
    - name: Build
      working-directory: './src'
      run: dotnet build --configuration Debug --no-restore
    - uses: microsoft/action-publish-symbols@v2.1.6
      with:
        accountName: <Azure DevOps Account Name>
        symbolServiceUrl: 'https://artifacts.dev.azure.com'
        personalAccessToken: ${{ secrets.PERSONALACCESSTOKEN }}
```

Example Usage with multiple search patterns:

```yaml
- uses: microsoft/action-publish-symbols@v2.2.0
  with:
    accountName: <Azure DevOps Account Name>
    symbolServiceUrl: 'https://artifacts.dev.azure.com'
    personalAccessToken: ${{ secrets.PERSONALACCESSTOKEN }}
    searchPattern: |
      '**/bin/**/*.pdb'
      '**/bin/**/*.exe'
```

The account name should be the Azure DevOps Organization name.

The scope of the PAT ( Personal Access Token) generated from Azure DevOps to authenticate the request to Artifacts server should be of the include scopes:
- Symbols - Read, Write & Manage
- Build - Read, Write & Manage

Sample usage in a .Net Core Project: https://github.com/tanmayghosh2507/GitHubPublicActiontest

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

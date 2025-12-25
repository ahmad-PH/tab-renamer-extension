
# Tab Renamer

### DataDog Agent

Running The Agent:
```
set -a && source .env && set +a && bash -c "$(curl -L https://install.datadoghq.com/scripts/install_mac_os.sh)"
```

Checking the status:
You can check the agent status using the "datadog-agent status" command
or by opening the webui using the "datadog-agent launch-gui" command.

### DataDog MCP Server 

Running the MCP server:
```
set -a && source .env && set +a && uvx --from git+https://github.com/shelfio/datadog-mcp.git datadog-mcp
```
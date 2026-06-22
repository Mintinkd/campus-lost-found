const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');
const imageRecognition = require('../services/imageRecognition');

const server = new Server({
  name: 'huawei-image-recognition',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'recognize_item',
      description: '识别物品图片，返回类别标签和置信度。接入华为云图像识别服务。',
      inputSchema: {
        type: 'object',
        properties: {
          imageBase64: {
            type: 'string',
            description: '图片的Base64编码字符串'
          }
        },
        required: ['imageBase64']
      }
    },
    {
      name: 'get_categories',
      description: '获取支持的物品分类标签列表',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'recognize_item') {
    const result = await imageRecognition.recognizeImage(args.imageBase64);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  if (name === 'get_categories') {
    const categories = imageRecognition.getCategories();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ categories }, null, 2)
      }]
    };
  }

  throw new Error(`未知工具: ${name}`);
});

async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP图像识别服务已启动');
}

startMcpServer().catch(err => {
  console.error('MCP服务启动失败:', err);
  process.exit(1);
});
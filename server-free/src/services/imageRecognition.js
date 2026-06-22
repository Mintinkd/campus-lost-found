const config = require('../config');

const CATEGORIES = [
  '雨伞', '钱包', '钥匙', '手机', '书包',
  '水杯', '耳机', '证件', '手表', '衣服',
  '眼镜', '笔记本电脑', '平板', '充电器', '银行卡',
  '书本', '文具', '饰品', '其他'
];

const FORBIDDEN_ITEMS = ['刀具', '枪支', '爆炸物', '毒品'];

async function recognizeImage(imageBase64) {
  const provider = config.recognition.provider;

  if (provider === 'huawei' && config.recognition.hwCloud.ak) {
    return recognizeWithHuawei(imageBase64);
  }

  return recognizeWithTensorFlow(imageBase64);
}

async function recognizeWithTensorFlow(imageBase64) {
  try {
    const tf = require('@tensorflow/tfjs-node');
    const mobilenet = require('@tensorflow-models/mobilenet');

    const buffer = Buffer.from(imageBase64, 'base64');
    const tfimage = tf.node.decodeImage(buffer, 3);
    const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    const predictions = await model.classify(tfimage);
    tfimage.dispose();

    if (!predictions || predictions.length === 0) {
      return { success: true, category: '其他', confidence: 0, needsConfirm: true };
    }

    const topPrediction = predictions[0];
    const confidence = topPrediction.probability;
    const mappedCategory = mapToCategory(topPrediction.className);

    const isForbidden = FORBIDDEN_ITEMS.some(item =>
      topPrediction.className.toLowerCase().includes(item.toLowerCase())
    );

    if (isForbidden) {
      return { success: true, category: null, confidence, isForbidden: true };
    }

    return {
      success: true,
      category: mappedCategory || '其他',
      confidence,
      needsConfirm: confidence < 0.7,
      allTags: predictions.slice(0, 5).map(p => ({
        tag: p.className,
        category: mapToCategory(p.className),
        confidence: p.probability
      }))
    };
  } catch (error) {
    console.error('TensorFlow.js识别异常:', error.message);
    return { success: false, error: error.message, fallback: true };
  }
}

async function recognizeWithHuawei(imageBase64) {
  try {
    const { ImageClient } = require('@huaweicloud/huaweicloud-sdk-image');
    const hwConfig = config.recognition.hwCloud;
    const client = ImageClient.newBuilder()
      .withAk(hwConfig.ak)
      .withSk(hwConfig.sk)
      .withRegion(hwConfig.region)
      .withProjectId(hwConfig.projectId)
      .build();

    const request = new ImageClient.RunImageTaggingRequest();
    request.body = { image: imageBase64, limit: 5, threshold: 30 };
    const response = await client.runImageTagging(request);
    const tags = response.result.tags || [];

    if (tags.length === 0) {
      return { success: true, category: '其他', confidence: 0, needsConfirm: true };
    }

    const topTag = tags[0];
    const confidence = topTag.confidence / 100;
    const mappedCategory = mapToCategory(topTag.tag);

    return {
      success: true,
      category: mappedCategory || '其他',
      confidence,
      needsConfirm: confidence < 0.7,
      allTags: tags.slice(0, 5).map(t => ({
        tag: t.tag,
        category: mapToCategory(t.tag),
        confidence: t.confidence / 100
      }))
    };
  } catch (error) {
    console.error('华为云识别异常:', error.message);
    return { success: false, error: error.message, fallback: true };
  }
}

function mapToCategory(tag) {
  const tagLower = tag.toLowerCase();
  const mapping = {
    'umbrella': '雨伞', '伞': '雨伞', '雨伞': '雨伞',
    'wallet': '钱包', '钱包': '钱包', 'purse': '钱包',
    'key': '钥匙', '钥匙': '钥匙',
    'phone': '手机', '手机': '手机', 'smartphone': '手机', 'cellphone': '手机',
    'bag': '书包', '书包': '书包', 'backpack': '书包', '背包': '书包', 'knapsack': '书包',
    'cup': '水杯', '水杯': '水杯', 'bottle': '水杯', '保温杯': '水杯', 'mug': '水杯',
    'headphone': '耳机', '耳机': '耳机', 'earphone': '耳机', 'earbuds': '耳机',
    'id card': '证件', '身份证': '证件', '学生证': '证件', '证件': '证件',
    'watch': '手表', '手表': '手表',
    'clothes': '衣服', '外套': '衣服', 'jacket': '衣服', '衣服': '衣服', 'coat': '衣服',
    'glasses': '眼镜', '眼镜': '眼镜', 'spectacles': '眼镜',
    'laptop': '笔记本电脑', '笔记本电脑': '笔记本电脑', '电脑': '笔记本电脑', 'notebook': '笔记本电脑',
    'tablet': '平板', '平板': '平板', 'ipad': '平板',
    'charger': '充电器', '充电器': '充电器',
    'bank card': '银行卡', '银行卡': '银行卡', 'credit card': '银行卡',
    'book': '书本', '书本': '书本', '书': '书本',
    'pen': '文具', '文具': '文具', 'pencil': '文具'
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (tagLower.includes(key.toLowerCase())) return value;
  }
  return null;
}

function getCategories() {
  return CATEGORIES;
}

module.exports = { recognizeImage, getCategories, mapToCategory };
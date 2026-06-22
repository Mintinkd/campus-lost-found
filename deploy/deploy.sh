#!/bin/bash
set -e

echo "========================================="
echo "  校园失物招领智能平台 - 华为云一键部署"
echo "========================================="

REGION=${HW_REGION:-cn-north-4}
CLUSTER=${HW_CCE_CLUSTER:-campus-lost-found}
IMAGE_REPO=${HW_SWR_REPO:-swr.cn-north-4.myhuaweicloud.com/campus-lost-found}

echo "[1/5] 构建后端Docker镜像..."
cd server
docker build -t ${IMAGE_REPO}/backend:latest .
echo "✓ 镜像构建完成"

echo "[2/5] 推送镜像到华为云SWR..."
docker push ${IMAGE_REPO}/backend:latest
echo "✓ 镜像推送完成"

echo "[3/5] 创建华为云资源..."
# 创建OBS桶
obsutil mkdir obs://campus-lost-found-photos 2>/dev/null || echo "OBS桶已存在"

# 创建SMN主题
hwcloud smn create-topic --name campus-lost-found-notifications --region ${REGION} 2>/dev/null || echo "SMN主题已存在"

echo "✓ 云资源创建完成"

echo "[4/5] 部署到华为云CCE..."
kubectl apply -f ../deploy/k8s-deployment.yaml --record
kubectl rollout status deployment/campus-lost-found-backend --timeout=300s
echo "✓ 部署完成"

echo "[5/5] 验证部署..."
sleep 10
HEALTH_URL=$(kubectl get svc campus-lost-found-backend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if curl -sf http://${HEALTH_URL}:3000/api/v1/health > /dev/null; then
  echo "✓ 健康检查通过"
else
  echo "✗ 健康检查失败，请检查日志"
  kubectl logs deployment/campus-lost-found-backend --tail=50
  exit 1
fi

echo ""
echo "========================================="
echo "  部署成功！"
echo "  API地址: http://${HEALTH_URL}:3000"
echo "  健康检查: http://${HEALTH_URL}:3000/api/v1/health"
echo "========================================="
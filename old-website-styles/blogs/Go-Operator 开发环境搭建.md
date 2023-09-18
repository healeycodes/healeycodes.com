# Go-Operator 开发环境搭建

开发环境为了考虑到镜像的快速上传下载使用，使用 docker 官方的 registry:2 项目。所以本篇将包括以下内容：

1. 部署 docker registry:2；
2. 修改默认的 Go-Operator 模版生成的 Makefile，以使得其更加适合于我们的开发环境；
3. 开发自测流程。

使用本篇之前，请确保你本地已经安装了如下组件：

1. kind	: v0.14.0 g
2. go       : 1.18.4 linux/amd64

## 部署 registry

### 简介

registry 是 docker 官方的用来自建本地私有仓库的容器项目。这将大大加速本地获取镜像的效率。（从本地仓库拉镜像，比从远程官方服务器拉取镜像，肯定快多了呢）

### kind 的历史遗留问题

需要注意的是 kind 部署的集群，如果要获取自定义镜像的话，需要将镜像打进集群去。具体可以参照官方[文档](https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster)。

因为这样的历史原因，所以我们需要使用 kind-registry 的自建仓库。（**注，此处我没有做相关验证，所以可能是错误的说法**）

### 正式操作

可以参考这个项目：https://github.com/tilt-dev/kind-local

但是更建议参考 kind 官方： https://kind.sigs.k8s.io/docs/user/local-registry/

我这边采取的方式是前者，并且将相关的脚本放入了我的常用脚本[仓库](https://github.com/Chever-John/common_bash/tree/master/kind-registry)。

然后你的本地，端口为 5000 的自建仓库就建好了。

接下来首先安装 Operator-sdk，以及初始化一个项目。请参考 Operator-sdk 的[官方文档](https://sdk.operatorframework.io/docs/building-operators/golang/)。

然后开始修改 Operator-sdk 的默认配置，使其更加适合我们的开发环境。

## 修改默认的 Go-Operator 的 Makefile

### 基础默认的配置

```bash
VERSION ?= 0.0.1
REGISTRY ?= "localhost:5000"
IMAGE_TAG ?= dev
IMG ?= "example.com/memcached-operator:v0.0.1"
```

### docker-build && docker-push

直接复制默认的 deploy 和 docker-build 和 docker-push。

```bash
## 以前的
.PHONY: docker-build
docker-build: test ## Build docker image with the manager.
	docker build -t ${IMG} .

.PHONY: docker-push
docker-push: ## Push docker image with the manager.
	docker push ${IMG}

## 现在的
.PHONY: docker-build-dev
docker-build-dev: test ## Build docker image with the manager.
	docker build -t ${IMG} .
	docker tag ${IMG} ${REGISTRY}/${IMG}

.PHONY: docker-push-dev
docker-push-dev: ## Push docker image with the manager.
	docker push ${REGISTRY}/${IMG}

```

### make deploy

为了开发用的，我直接 make deploy-dev，就可以部署到我本地的集群中去。

前提是我使用 `make docker-build-dev docker-push-dev IMG="example.com/memcached-operator:v0.0.5"` 先构建并且上传到本地的 registry:2 仓库中去。

此处注意因为是 kind，要么将镜像打进集群去，要么使用 kind-registry 项目。

```bash
.PHONY: deploy
deploy: manifests kustomize ## Deploy controller to the K8s cluster specified in ~/.kube/config.
	cd config/manager && $(KUSTOMIZE) edit set image controller=${IMG}
	$(KUSTOMIZE) build config/default | kubectl apply -f -

.PHONY: deploy-dev
deploy-dev: manifests kustomize ## Deploy controller to the K8s cluster specified in ~/.kube/config.
	cd config/manager && $(KUSTOMIZE) edit set image controller=${REGISTRY}/${IMG}
	$(KUSTOMIZE) build config/default | kubectl apply -f -
```

## 开发自测流程

### 构建和推送镜像

首先构建镜像和推送镜像到 本地的 registry 仓库

```bash
make docker-build-dev docker-push-dev IMG="example.com/memcached-operator:v0.0.5"
```

根据我们的默认配置，如果不加入最后的 IMG="......"。默认就是 `example.com/memcached-operator:v0.0.1` 了，即如下的命令：

```bash
make docker-build-dev docker-push-dev
```

以下同理。

### 部署 Operator

```bash
make deploy-dev IMG="example.com/memcached-operator:v0.0.5"
```

### 部署 yaml

```bash
kubectl apply -f config/samples/cache_v1alpha1_memcached.yaml
```

### 卸载部署 yaml

```bash
kubectl delete -f config/samples/cache_v1alpha1_memcached.yaml
```

### 卸载部署 Operator

```bash
make undeploy
```


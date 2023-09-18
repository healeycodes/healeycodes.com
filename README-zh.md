# 江某人的个人网站

[![Chinese version](http://cdn.mr8god.cn/img/chinese.svg)](README-zh.md)  [![English version](https://cdn.mr8god.cn/img/english.svg)](README.md)

你可以通过点击这个图标来切换不同语言版本的 README.md 文件。

至于为什么要自称江某人呢？这得从一个高中数学老师说起……

好了好了，咱不扯那么远～回到今天的话题——搭建个人网站。我们从背景讲起叭～

## 背景

熟悉我的人知道，我有过很多个个人网站，其中坚持时间最长的估计就是上一任，用 docusaurus 搭建的网站了（<https://www.cheverjohn.xyz/>）了，整整坚持了六个月有余。我自认为还是很喜欢输出一些文字性的东西的。喜欢将自己所学习的东西分享出去，不断与他人交流，了解一些杂七杂八的东西，不仅限于技术。所以这是我有个人网站的**本心**。

此外，搭建个人网站，我经历了大概这样的技术路线。

| 时间  | 域名    | 技术栈 | 大致作用 |
| ------- | --------- | ------ | -------- |
| 2020.02-2020.06 | mr8god.cn | hexo/travi ci/GitHub action   | 写一些技术文章，理解了 CI 等工具的重要性。 |
| 2020.07 ～ 2021.06 | mr8god.cn | Python / Django / Supervisor / CICD / Vue | 这就是一个非常具有整体性的项目了，我做到了**前后端分离**、**CICD**、**博客社区系统**等很多有意思的事情。 |
| 2021.10 ～ 2022.06 | cheverjohn.xyz | Docusaurus / React /vercel | 这是一个来自于 **meta** 的开源项目 **Docusaurus**，一般开源社区用作文档网站比较多一点，个人拿来做博客我也觉得相当够用了，不过我还是喜欢自己定义格式更多一点，哪怕我每一篇博客的格式都不一样。 |
| 2022.07.17 ～ now | cheverjohn.me | Html / nginx / js / query | 准备大干一场！ |

总之，我对最新的博客寄予厚望，总是需要有人折腾一点的叭～

## 部署方式

### 购买域名、域名相关操作

#### 最简单

找到一个合适的域名提供商购买即可。这边找的是 namesilo。

然后需要注意的是，我们只需要更改 namesilo 的 nameserver 即可。将其更改为如下：

```sh
ns1.vultr.com
ns2.vultr.com
```

这两个域名可以在服务器提供商那边获得。

#### 使用了 Cloudflare 服务

此处我使用了 Cloudflare 的服务所以，此处的 DNS nameserver 应该替换为如下：

```sh
jaime.ns.cloudflare.com
selah.ns.cloudflare.com
```

当然你也要注意将 Cloudflare 中的 DNS 设置成如下：

| Type      | Name          | Content       | Proxy status | TTL  |
| :-------- | :------------ | :------------ | :----------- | :--- |
| **A**     | cheverjohn.me | 45.76.99.217  | Proxied      | Auto |
| **CNAME** | *             | cheverjohn.me | Proxied      | Auto |
| **CNAME** | www           | cheverjohn.me | Proxied      | Auto |

### 购买服务器

找一个靠谱的服务器提供商，获得一个服务器。这边找的是 vultr。

买了服务器之后，需要注意的是，直接使用自带的 DNS 解析服务，构建一下即可。

### 第一种部署方式：NGINX 配置

#### 推荐指数：两颗星

使用 **NGINX** 作为反向代理服务器，将路由反向代理到 index.html，仅此而已。可以参考这个[链接](https://www.vultr.com/zh/docs/how-to-install-and-configure-nginx-on-a-vultr-cloud-server/#:~:text=Encrypt%20guide%20here.-,Configure%20Nginx%20as%20a%20Reverse%20Proxy,-Nginx%20can%20work)，获取更多的信息。

运行如下命令查看我的配置：

```bash
cat /etc/nginx/conf.d/cheverjohn.me.conf
```

我的 **NGINX** 的配置如下：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name cheverjohn.me www.cheverjohn.me;

    root /home/vultrchever/website/static;

    index index.html;

    access_log /var/log/nginx/cheverjohn.me.access.log;
    error_log /var/log/nginx/cheverjohn.me.error.log;

    location / {
        try_files $uri $uri/ =404;
    }

}
```

### 第二种部署方式：Docker 一下你就知道

#### 推荐指数：四颗星

这其实是我最推荐的，如果你刚刚在一个新的环境里去部署网站，那就无疑用这个方法，先顶上，后边再慢慢添加新的骚操作功能。

#### 编写个人网站的 Dockerfile

Dockerfile 文件内容如下：

```dockerfile
FROM nginx:alpine
COPY ./static /usr/share/nginx/html
```

#### 将个人网站打包成镜像

打包镜像命令如下：

```bash
docker build -t html-server-image:v1 .
```

然后直接用这个命令，注意开放服务器端口 80，即可正常运行网站，运行命令如下：

```bash
docker run -d -p 80:80 html-server-image:v1
```

### 第三种部署方式：APISIX 云原生网关部署

#### 推荐指数：四颗星

好啦好啦，上面讲的这些，绝对是不可能让你跟我一样，完全搭建出我的[网站](http://cheverjohn.me/)的。接下来输出干货。

#### 我的网站的整体部署架构

![myPersonalWebsiteArch2](assets/excalidraw/myPersonalWebsiteArch3.png)

简单用言语介绍一下，这一次我尝试使用了 Apache APISIX 云原生网关来部署我的个人网站。这里边 Apache APISIX、Apache Dashboard、etcd、html-server 都是 Docker 镜像运行的容器。其中 html-server 是我自己自定义创建的镜像容器。其构建的方法可以往上看。

#### 构建后端服务镜像（html-server）

首先 clone 我存放在 GitHub 上的项目。

```bash
git clone git@github.com:Chever-John/SimpleWebsite.git
```

然后进入到仓库里。

```bash
cd SimpleWebsite
```

查看 Dockerfile 文件确认无误。

```bash
cat Dockerfile
<<<!Output>>>
FROM nginx:alpine
COPY ./static /usr/share/nginx/html
```

确认无误后运行镜像构建命令。

```bash
docker build -t html-server-image:v1 .
```

此处，我可以随意改变镜像的版本，比如我想构建 v2 版本的镜像，那么命令就是：

```sh
docker build -t html-server-image:v2 .
```

#### 安装 APISIX、APISIX Dashboard

官方自带的 APISIX-Docker 项目，我这边直接复制过来了其中 example 的文件夹，并将该文件夹魔改了一下放在本项目的根目录下。其中魔改的部分，这边做一下解释。

##### 魔改内容：修改 APISIX 服务端口

clone 官方提供的 APISIX-Docker 项目。

```bash
git clone git@github.com:apache/apisix-docker.git
```

然后进入到 example 的目录里。

```bash
cd apisix-docker/example
```

由于这边我需要修改 APISIX 这个网关的默认服务端口，从 9080 改到 80，所以我们需要修改一下 docker-compose.yml 文件。并将该文件的主要部分，包含 APISIX、Dashboard 等项目的 Services 复制到本项目根目录的 Dockerfile。

这中间的改动如图所示：

![9080to80](./assets/ScreenCut/9080to80.png)

可以看见，只是将原先的 `9080:9080` 改为 `80:9080`，~~仅此而已~~。

##### 魔改内容：修改网络配置（重点🌟）

不，此处还需要加一个网络配置。因为我本次项目涉及到的软件主要分为两大部分，第一部分是 APISIX 及其衍生项目，第二部分是个人网站项目。而我的 Dockerfile 中间，分别为两个项目配置了不同的网络。如下面的文件演示：

```yml
networks:
  website:
    driver: bridge
  apisix:
    driver: bridge
```

上面的配置，表示我在 Docker 种创建了两个网络。

```yml
services:
  webservice81:
    image: html-server-image:${TAG}
    restart: always
    ports:
      - "81:80/tcp"
    networks:
      website:

  webservice82:
    image: html-server-image:${TAG}
    restart: always
    ports:
      - "82:80/tcp"
    networks:
      website:
```

上面是我个人网站项目的部署文件，可以看到 networks 设置为 website。

```yml
 apisix-dashboard:
    image: apache/apisix-dashboard:2.13-alpine
    restart: always
    volumes:
    - ./apisix_config/dashboard_conf/conf.yaml:/usr/local/apisix-dashboard/conf/conf.yaml
    ports:
    - "9000:9000"
    networks:
      apisix:

  apisix:
    image: apache/apisix:2.14.1-alpine
    restart: always
    volumes:
      - ./apisix_config/apisix_log:/usr/local/apisix/logs
      - ./apisix_config/apisix_conf/config.yaml:/usr/local/apisix/conf/config.yaml:ro
    depends_on:
      - etcd
    ##network_mode: host
    ports:
      - "80:9080/tcp"
      - "9091:9091/tcp"
      - "9443:9443/tcp"
      - "9092:9092/tcp"
    networks:
      - apisix
      - website
```

重头戏来了，这边可以看到，我 APISIX 及其衍生项目的 networks 都设置为 apisix。但是我的 APISIX 额外被设置了 website 的网络。这个设置就意味着让 APISIX 同时处于 Docker 中的两个网络配置中。这样，我的 APISIX 就能既能被 apisix 网络中的 dashboard 进行配置，也能代理上游的 website 网络中的个人网站项目服务。

#### 运行项目

因为我的项目需要版本。所以我们需要先打一个环境变量，让我的 Dockerfile 能够读取到我的环境变量。命令如下：

```sh
export TAG=v2
```

然后构建我的后端服务镜像，命令如下：

```sh
docker build -t html-server-image:v2 .
```

修改完之后，开始运行容器，运行命令的位置应该是在 Dockerfile 文件所在的目录下，命令如下：

```bash
docker-compose -p docker-apisix up -d
```

#### 配置 Grafana（可选项）

这个需要额外配置，需要修改一下 `apisix-docker/example/dashboard_conf/conf.yaml` 文件。具体修改部分参照下图：

![enableGrafana](./assets/ScreenCut/enableGrafana.png)

然后 APISIX-Dashboard 就可以正常显示了。

此处注意，frame-src 后边要设置好正确的域名地址，此处是 198.13.62.15，如果你买了新的服务器，它会提供这个地址给你。对，就是 IPv4 地址。

#### 然后配置上游

```json
 {
  "nodes": [
    {
      "host": "webservice83",
      "port": 80,
      "weight": 1
    },
    {
      "host": "webservice84",
      "port": 80,
      "weight": 1
    },
    {
      "host": "webservice81",
      "port": 80,
      "weight": 1
    },
    {
      "host": "webservice82",
      "port": 80,
      "weight": 1
    }
  ],
  "timeout": {
    "connect": 6,
    "send": 6,
    "read": 6
  },
  "type": "roundrobin",
  "scheme": "http",
  "pass_host": "pass",
  "name": "websiteUpstream",
  "keepalive_pool": {
    "idle_timeout": 60,
    "requests": 1000,
    "size": 320
  }
}
```

#### 配置路由

```json
{
  "uri": "/*",
  "name": "websiteRoute",
  "methods": [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
    "CONNECT",
    "TRACE"
  ],
  "hosts": [
    "*.cheverjohn.me",
    "www.cheverjohn.me",
    "cheverjohn.me"
  ],
  "upstream_id": "429171766888235719",
  "status": 1
}
```

然后一切应该就正常了。

## 版本迭代更新

### docker-compose（部分内容可能废弃⚠️）

如果我更新了网站的内容，比如说我增加了一篇博客，那我们需要进行网站系统的版本迭代更新啊，这里边有很多学问，蓝绿发布啦、金丝雀发布啦、灰度啦，有一说一我对此不精通，纯粹是大概知道有这么些概念，但我网站目前采用的只会是最简单的“停止”到“重启”。

我们可以使用 docker-compose 来进行版本的快速迭代更新。

docker-compose 文件位于该[目录](.docker-compose.yaml)

第一步：首先制定版本，命令如下：

```bash
export TAG=x.x.x
```

第二步：部署，部署命令如下：

```bash
docker-compose -p website up -d --build
```

第三步（可选）：如果已经部署了，需要先停止容器，命令如下：

```bash
docker-compose -p website down
```

然后可以重复第二步了。

## TODO

### 云原生

- [x] Docker 部署：将前端项目打包好，以 Docker 镜像的方式进行部署；
- [ ] 在前置任务完成的基础上，尝试集群部署。

#### API 网关选型

- [x] 探索 API 网关的可行性以及必要性。

### 前端

- [ ] 将博客的 html 样式统一；
- [x] 去~~坑~~坤坤，让坤坤帮俺搞好前端的样式架构。

### 运维

#### CICD

- [ ] 将自动部署搞好，具体需求：我一提交本地代码，我的部署服务器便会自动拉取代码
  - [ ] 进行 CI 工具选型；
  - [ ] 在云端服务器上实现。

#### 灰度发布/金丝雀发布

- [ ] 如小标题，要用 nginx 做好**灰度发布**

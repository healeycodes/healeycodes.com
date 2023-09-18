# OpenResty

OpenResty 是一个兼具开发效率和性能的服务端开发平台。虽然它是基于 NGINX 实现，但是其适用范围，早已远远超过反向代理和负载均衡。

其核心是基于 NGINX 的一个 C 模块（lua-nginx-module），该模块将 LuaJIT 嵌入到 NGINX 服务器中，并对外提供一套完整的 Lua API，透明地支持非阻塞 I/O，提供了轻量级线程、定时器等高级抽象。同时，围绕这个模块，OpenResty 构建了一套完备的测试框架、调试技术以及由 Lua 实现的周边功能库。

你可以用 Lua 语言来进行字符串和数值运算、查询数据库、发送 HTTP 请求、执行定时任务、调用外部命令等，还可以用 FFI 的方式调用外部 C 函数。这基本上可以满足服务端开发需要的所有功能。

OpenResty 第一个版本是用 Perl 写的。后来全部替换成了 Lua，但是其周边生态项目还是有 Perl 的影子。

OpenResty 的八个重点：

1. 同步非阻塞的编程模式；
2. 不同阶段的作用；
3. LuaJIT 和 Lua 的不同之处；
4. OpenResty API 和周边库；
5. 协程和 cosocket；
6. 单元测试框架和性能测试工具；
7. 火焰图和周边工具链；
8. 性能优化。

动态链路追踪工具

> **OpenResty 只是把 NGINX 当作底层的网络库来使用**

## 管理第三方包

luarocks 和 opm

> 你不应该使用任何 Lua 世界的库来解决上述问题，而是应该使用 cosocket 的 lua-resty-* 库。Lua 世界的库很可能会带来阻塞，让原本高性能的服务，直接下降几个数量级。这是 OpenResty 初学者的常见错误，而且并不容易觉察到。
>

### luarocks

## 与 NGINX 相关的知识

NGINX 有

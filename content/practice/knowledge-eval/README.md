# FDE前线 · 本地实践包

这是使用合成数据的验收练习，不是案例企业的源码、数据或已验证业务成果。无需注册、API Key、第三方 Python 包或网络请求。Python 3.10+。

## 运行

在解压后的目录运行：

```sh
python3 run.py
python3 run.py --check
```

Windows 可使用 `py -3` 替代 `python3`。第一条命令生成 output.json；第二条命令比较预期结果，成功输出 PASS，不一致返回非零退出码。修改 input.json 后请先运行第一条查看结果；只有恢复示例输入后才应与随包 expected.json 一致。

## 文件

- input.json：可修改的合成输入
- run.py：标准库脚本，所有输入输出都留在本机
- expected.json：示例的预期结果
- acceptance.md：可填写的项目验收模板
- LICENSE：MIT 许可

## 本练习

给候选回答增加引用、权限和无答案检查，理解哪些结果必须转人工。

预期：2 条通过、2 条失败；失败原因分别为引用越权、回答缺少引用。

## 适用边界

脚本检查引用与权限契约，不判断回答语义是否正确；引用存在不代表内容忠实，仍需专家核对、检索评估和权限系统集成。

对应案例：https://fdeopen.com/cases/field-fde-068

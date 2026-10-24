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

从合成报价记录出发，检查缺失成本、计算估算误差，并把异常交给人工复核。

预期：4 条有效记录，1 条数据异常，2 条误差达到或超过 10%，平均绝对百分比误差 10%。

## 适用边界

脚本计算误差，不训练成本模型。阈值 10% 仅用于演练，需要按零件类别、估算口径与损失成本重新约定。实际成本缺失或为零时列入数据异常。

对应案例：https://fdeopen.com/cases/field-fde-031

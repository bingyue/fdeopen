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

用合成对照组和实验组数据复盘转化、触达成本与扣除优惠后的贡献。

预期：对照组转化率 10%、实验组 12%；贡献分别为 3,900 与 3,800，结论为继续验证。

## 适用边界

脚本只做描述性计算，不运行真实营销、不访问客户数据，不进行显著性检验。上线需要随机化检查、样本量估算、完整成本和退款口径。

对应案例：https://fdeopen.com/cases/field-fde-069

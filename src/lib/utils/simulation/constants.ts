/**
 * 水处理过滤效果模拟 - 工艺单元参数常量
 * 从 filter-simulation.ts 拆分 (lines 561-783)
 *
 * 各工艺单元的典型运行参数和去除效率范围
 * 数据来源：[1]《水处理工程》、[6]《工业水处理技术》
 */

export const PROCESS_UNIT_PARAMS = {
  // 多介质过滤器 - 深度过滤
  // 参考: Iwasaki (1937) 深度过滤方程, Lenntech多媒体过滤器计算, DuPont FilmTec Media Filtration手册
  // SS(可滤残渣)去除机理: 机械筛分 + 惯性碰撞 + 布朗扩散
  // SS典型粒径: 0.1-100 μm，与浊度有强相关性
  filter_media: {
    name: '多介质过滤器',
    filterVelocity: { min: 8, max: 12, unit: 'm/h' },  // 过滤速度
    bedDepth: { min: 800, max: 1200, unit: 'mm' },      // 滤层深度
    removal: {
      turbidity: { min: 50, max: 80, avg: 65 },         // %
      silt: { min: 70, max: 90, avg: 80 },              // % (悬浮物/浊度)
      ss: { min: 65, max: 85, avg: 75 },               // % (可滤残渣，与浊度类似)
      tss: { min: 70, max: 90, avg: 80 },              // % (总悬浮固体)
      cod: { min: 10, max: 30, avg: 20 },               // %
      iron: { min: 30, max: 50, avg: 40 },              // %
      bacteria: { min: 30, max: 50, avg: 40 }           // %
    }
  },

  // 活性炭过滤器 - 吸附
  filter_carbon: {
    name: '活性炭过滤器',
    contactTime: { min: 10, max: 20, unit: 'min' },     // 接触时间
    bedDepth: { min: 1000, max: 1500, unit: 'mm' },
    removal: {
      cod: { min: 30, max: 60, avg: 45 },
      chlorine: { min: 90, max: 99, avg: 95 },          // %
      toc: { min: 40, max: 70, avg: 55 },               // %
      odor: { min: 80, max: 95, avg: 88 },              // %
      bacteria: { min: 20, max: 40, avg: 30 }
    }
  },

  // 软化器 - 离子交换
  softener: {
    name: '软化器',
    exchangeCapacity: { min: 1.2, max: 1.8, unit: 'eq/L' }, // 交换容量
    removal: {
      hardness: { min: 90, max: 98, avg: 95 },          // %
      iron: { min: 80, max: 95, avg: 88 },              // %
      manganese: { min: 80, max: 95, avg: 88 }          // %
    }
  },

  // 精密过滤器 - 表面过滤
  // 参考: Lenntech cartridge filter calculations, Water Treatment Handbook (Degremont)
  // SS去除机理: 机械筛分，孔径决定截留能力
  filter_precision: {
    name: '精密过滤器',
    poreSize: { min: 0.1, max: 100, unit: 'μm' },       // v3.8: 扩展孔径范围至0.1μm微滤级别
    removal: {
      turbidity: { min: 80, max: 95, avg: 88 },         // % (默认5μm基准)
      silt: { min: 90, max: 99, avg: 95 },              // % (悬浮物/浊度)
      ss: { min: 85, max: 98, avg: 92 },              // % (可滤残渣)
      tss: { min: 90, max: 99, avg: 95 },              // % (总悬浮固体)
      bacteria: { min: 50, max: 80, avg: 65 },         // % (默认5μm基准)
      virus: { min: 10, max: 50, avg: 30 }              // % v3.8新增: 病毒去除率
    }
  },


  // 超滤UF - 筛分机理
  // 参考: DuPont SFP/SFD UF膜技术手册, WAVE软件设计原理
  // SS去除机理: 完全筛分，UF孔径0.001-0.1μm远小于SS颗粒
  // SS典型粒径0.1-100μm，UF对其完全截留
  uf: {
    name: '超滤',
    mwco: { min: 10000, max: 100000, unit: 'Da' },      // 截留分子量
    poreSize: { min: 0.001, max: 0.1, unit: 'μm' },     // 孔径
    removal: {
      turbidity: { min: 98, max: 99.9, avg: 99.5 },     // %
      silt: { min: 99, max: 99.9, avg: 99.5 },          // % (悬浮物)
      ss: { min: 99.5, max: 99.9, avg: 99.7 },        // % (可滤残渣，近似完全截留)
      tss: { min: 99.5, max: 99.9, avg: 99.8 },       // % (总悬浮固体，完全截留)
      bacteria: { min: 99, max: 99.99, avg: 99.9 },     // % (LRV 2-4)
      virus: { min: 90, max: 99, avg: 95 },             // % (LRV 1-2)
      cod: { min: 20, max: 40, avg: 30 },               // 大分子有机物
      iron: { min: 80, max: 95, avg: 88 },              // 胶体铁
      silica: { min: 50, max: 80, avg: 65 },            // 胶体硅
      sdi: { target: '< 3' }                            // 出水SDI
    }
  },

  // 纳滤NF - Donnan效应+筛分
  // 数据来源：Dow Filmtec NF膜技术手册、水处理工程文献
  // NF膜特点：对二价离子和高分子有机物截留率高，对一价离子截留率低
  nf: {
    name: '纳滤',
    mwco: { min: 200, max: 1000, unit: 'Da' },
    removal: {
      // NF膜对不同离子的截留率差异很大（Donnan效应）
      // 二价离子（SO₄²⁻, Ca²⁺, Mg²ⁿ）：高截留
      // 一价离子（Na⁺, Cl⁻）：低截留
      // 数据来源：FilmTec NF90/NF270/NF245产品手册
      tds: { min: 30, max: 60, avg: 45 },               // TDS（综合效果）
      hardness: { min: 80, max: 95, avg: 88 },          // 硬度（二价离子，高截留）
      sulfate: { min: 92, max: 98, avg: 95 },           // 硫酸根（SO₄²⁻）特别高
      chloride: { min: 5, max: 30, avg: 15 },           // 氯离子（Cl⁻）特别低
      cod: { min: 85, max: 95, avg: 90 },               // COD（分子量>200）
      toc: { min: 85, max: 95, avg: 90 },               // TOC（有机物分子量>200）
      silica: { min: 30, max: 60, avg: 45 },            // 二氧化硅
      bacteria: { min: 99, max: 99.9, avg: 99.5 },      // 细菌 (LRV 2-3)
      virus: { min: 95, max: 99.9, avg: 99 }            // 病毒 (LRV 2-3)
    }
  },

  // 反渗透RO - 溶解扩散
  // 数据来源：FilmTec技术手册、水处理工程文献
  ro: {
    name: '反渗透',
    rejection: {
      // 标准脱盐率（标准测试条件：2000ppm NaCl, 225psi, 25°C, 15%回收率）
      // 实际应用中根据进水TDS、回收率、温度等因素调整
      monovalent: { min: 96, max: 99, avg: 98 },        // 一价离子（Na⁺, Cl⁻）
      divalent: { min: 97, max: 99.5, avg: 99 },        // 二价离子（Ca²⁺, Mg²⁺, SO₄²⁻）
      tds: { min: 96, max: 99.5, avg: 98 },             // TDS（根据进水TDS动态调整）
      hardness: { min: 97, max: 99.5, avg: 98.5 },      // 硬度（二价离子）
      cod: { min: 95, max: 99, avg: 97 },               // COD/TOC（有机物）
      silica: { min: 95, max: 99, avg: 97 },            // 二氧化硅（分子态）
      bacteria: { min: 99.9, max: 99.99, avg: 99.95 },  // 细菌 (LRV 3-4)
      virus: { min: 99, max: 99.9, avg: 99.5 },          // 病毒 (LRV 2-3)
      ss: { min: 99.5, max: 99.9, avg: 99.7 },         // % (可滤残渣，溶解性固体)
      tss: { min: 99.9, max: 99.99, avg: 99.95 },       // % (总悬浮固体)
      nitrate: { min: 95, max: 99, avg: 97 },           // % (硝酸根，一价阴离子)
      bicarbonate: { min: 97, max: 99.5, avg: 98.8 },   // % (重碳酸根)
      sulfate: { min: 99, max: 99.8, avg: 99.5 }        // % (硫酸根，二价阴离子)
    }
  },

  // EDI电去离子
  // 参考: Electropure EDI技术手册, Ionpure技术资料
  // EDI对SS的去除主要依赖于前段UF/RO的预处理
  // EDI进水通常要求SS<1 mg/L
  edi: {
    name: 'EDI',
    removal: {
      tds: { min: 90, max: 99, avg: 95 },               // %
      silica: { min: 95, max: 99, avg: 97 },            // %
      bacteria: { min: 99, max: 99.9, avg: 99.5 },       // %
      hardness: { min: 95, max: 99.5, avg: 98 },         // % (硬度)
      nitrate: { min: 90, max: 99, avg: 95 },           // % (硝酸根)
      ss: { min: 85, max: 95, avg: 90 }                // % (可滤残渣，需前处理)
    }
  },

  // 紫外线消毒 UV
  // 数据来源：《给水排水设计手册》、USEPA UV消毒技术指南
  // 灭活机理：DNA/RNA损伤（260nm UV-C吸收）
  // LRV（对数去除值）取决于UV剂量（mJ/cm²）
  uv: {
    name: '紫外线消毒',
    uvDose: { min: 20, max: 400, unit: 'mJ/cm²' },     // UV剂量
    // 不同微生物的目标剂量和去除率（基于USEPA标准）
    // 低剂量UV（20-40 mJ/cm²）：主要用于消毒
    // 中剂量UV（40-100 mJ/cm²）：高消毒+部分病毒灭活
    // 高剂量UV（100-400 mJ/cm²）：完全灭活（包括隐孢子虫、贾第虫等耐氯微生物）
    removal: {
      bacteria: { min: 90, max: 99.9, avg: 95 },        // 细菌（普通消毒90-99%，标准剂量99.9%）
      virus: { min: 90, max: 99, avg: 95 },              // 病毒（无保护情况）
      // 耐氯微生物（隐孢子虫、贾第虫）- UV有效
      cryptosporidium: { min: 99, max: 99.9, avg: 99.5 }, // 隐孢子虫（耐氯原虫）
      giardia: { min: 99, max: 99.9, avg: 99.5 }         // 贾第虫（耐氯原虫）
    },
    // UV消毒效率受水质影响
    // 浊度/TOC升高会降低有效剂量
    efficiencyFactor: {
      turbidity: 0.8,    // 浊度>1NTU时效率降低
      iron: 0.9,         // 铁离子会吸收UV
      uv254: 0.85        // UV254吸收值高时效率降低
    }
  },

  // 臭氧消毒 O₃
  // 数据来源：《水处理工程》、WHO臭氧消毒指南
  // 灭活机理：氧化损伤（细胞壁破裂、酶失活、DNA损伤）
  // 臭氧氧化还原电位：2.07V（比氯的1.36V更高）
  ozone: {
    name: '臭氧消毒',
    dose: { min: 1, max: 10, unit: 'mg/L' },           // 臭氧投加量
    contactTime: { min: 5, max: 15, unit: 'min' },     // 接触时间
    // CT值（浓度×时间）决定消毒效果
    // CT值计算：臭氧浓度(mg/L) × 接触时间(min)
    // CT值参考（20°C，pH 6-9）：
    // - 细菌：CT 0.02-0.2 mg·min/L
    // - 病毒：CT 0.2-2 mg·min/L
    // - 耐氯微生物：CT 1-10 mg·min/L
    removal: {
      bacteria: { min: 99, max: 99.99, avg: 99.9 },    // 细菌
      virus: { min: 99.9, max: 99.99, avg: 99.95 },    // 病毒（臭氧对病毒灭活效果好）
      cryptosporidium: { min: 99, max: 99.9, avg: 99.5 }, // 隐孢子虫
      giardia: { min: 99.9, max: 99.99, avg: 99.9 },   // 贾第虫
      // 臭氧的额外氧化效果
      cod: { min: 10, max: 30, avg: 20 },               // COD降低（氧化有机物）
      toc: { min: 5, max: 15, avg: 10 },               // TOC降低（氧化有机物）
      color: { min: 80, max: 95, avg: 88 },            // 脱色（氧化发色基团）
      manganese: { min: 90, max: 99, avg: 95 },       // 除锰（氧化Mn²⁺→MnO₂）
      iron: { min: 95, max: 99, avg: 97 }              // 除铁（氧化Fe²⁺→Fe³⁺）
    },
    // 臭氧分解受水质影响
    // 水温升高会加速分解
    // 碱度、pH影响残留臭氧浓度
    decomposition: {
      halfLife: { min: 5, max: 30, unit: 'min' },      // 半衰期（20°C）
      temperatureEffect: '温度每升高10°C，分解速率增加2-3倍'
    }
  },

  // 次氯酸钠消毒 NaOCl
  // 消毒能力相对较弱，但对维持管网余氯有效
  chemical_disinfection: {
    name: '化学消毒',
    removal: {
      bacteria: { min: 99, max: 99.9, avg: 99.5 },      // 细菌
      virus: { min: 99, max: 99.9, avg: 99.5 }          // 病毒
    }
  }
};

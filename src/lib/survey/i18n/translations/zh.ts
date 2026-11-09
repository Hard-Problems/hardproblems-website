// Mandarin Chinese (Simplified) translation of the 2026 survey. See ../types.ts.
import type { SurveyTranslation } from '../types';

export const zh: SurveyTranslation = {
  code: 'zh',
  content: {
    title: '我们想从工作中得到什么：一项设计与产品调查',
    shortTitle: '我们想从工作中得到什么',
    intro:
      '一项面向设计师、研究员、写作者和产品从业者的调查，了解他们对自己职业的感受。',
    why: [
      '关于企业希望从设计师和产品经理身上得到什么，相关数据很多；而关于设计师和产品经理希望从职业中得到什么，几乎没有数据。请帮助我们弥补这一空白。究竟是什么让人们对自己的工作感到满意？',
      '在我们的报告中，我们会尝试展示人们在这个行业里的哪些地方找到喜悦和自豪。'
    ],
    roleTerms: {
      'product-designer': '设计',
      'graphic-designer': '设计',
      'brand-designer': '设计',
      illustrator: '插画',
      'motion-designer': '动效设计',
      'service-designer': '服务设计',
      'industrial-designer': '设计',
      'design-researcher': '用户研究',
      'ux-designer': '设计',
      'ui-designer': '设计',
      'design-writer': '写作',
      'product-manager': '产品管理',
      founder: '您的组织',
      other: '您的领域'
    },
    roleSubjects: {
      founder: '做创始人',
      other: '我的职业'
    },
    roleQuestionText: {
      'product-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      'graphic-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      'brand-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      illustrator: {
        metaphor: '2026 年的插画，感觉就像……',
        'still-here-in-5': '五年后您仍在从事插画工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事插画职业吗？'
      },
      'motion-designer': {
        metaphor: '2026 年的动效设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事动效设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事动效设计职业吗？'
      },
      'service-designer': {
        metaphor: '2026 年的服务设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事服务设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事服务设计职业吗？'
      },
      'industrial-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      'design-researcher': {
        metaphor: '2026 年的用户研究，感觉就像……',
        'still-here-in-5': '五年后您仍在从事用户研究工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事用户研究职业吗？'
      },
      'ux-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      'ui-designer': {
        metaphor: '2026 年的设计，感觉就像……',
        'still-here-in-5': '五年后您仍在从事设计工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事设计职业吗？'
      },
      'design-writer': {
        metaphor: '2026 年的写作，感觉就像……',
        'still-here-in-5': '五年后您仍在从事写作工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事写作职业吗？'
      },
      'product-manager': {
        metaphor: '2026 年的产品管理，感觉就像……',
        'still-here-in-5': '五年后您仍在从事产品管理工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事产品管理职业吗？'
      },
      founder: {
        metaphor: '2026 年做创始人，感觉就像……',
        'still-here-in-5': '五年后您仍在经营自己的组织的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐成为创始人吗？'
      },
      other: {
        metaphor: '2026 年我的职业，感觉就像……',
        'still-here-in-5': '五年后您仍在您的领域工作的可能性有多大？',
        'would-recommend': '您会向比您年轻的朋友推荐从事您所在领域的职业吗？'
      }
    },
    defaultTerm: '设计',
    groups: {
      'about-you': {
        title: '关于您和您的工作单位'
      },
      bonus: {
        title: '附加题',
        hint: '您的回答已保存。'
      }
    },
    questions: {
      role: {
        text: '您的职位属于哪一类？',
        hint: '请选择最符合您的一项。',
        options: {
          'product-designer': '数字产品设计师',
          'graphic-designer': '平面设计师',
          'brand-designer': '品牌设计师',
          illustrator: '插画师',
          'motion-designer': '动效设计师',
          'service-designer': '服务设计师',
          'industrial-designer': '工业设计师',
          'design-researcher': '用户研究员',
          'ux-designer': 'UX 设计师',
          'ui-designer': 'UI 设计师',
          'design-writer': '写作者',
          'product-manager': '产品经理',
          founder: '创始人／企业主',
          other: '其他……'
        }
      },
      'career-satisfaction': {
        text: '您对您的（主要）工作满意程度如何？',
        options: {
          'completely-satisfied': '完全满意',
          'very-satisfied': '非常满意',
          'fairly-satisfied': '比较满意',
          neither: '既不满意也不不满意',
          'fairly-dissatisfied': '比较不满意',
          'very-dissatisfied': '非常不满意',
          'completely-dissatisfied': '完全不满意',
          'cant-choose': '无法选择'
        }
      },
      'role-security': {
        text: '您觉得自己目前的职位有多稳定？',
        labels: [
          '非常不稳定',
          '比较不稳定',
          '有点不稳定',
          '有点稳定',
          '比较稳定',
          '稳如磐石'
        ]
      },
      skill: {
        text: '我认为，我能胜任我的工作',
        options: {
          always: '总是',
          'most-of-the-time': '大多数时候',
          sometimes: '有时',
          rarely: '很少',
          never: '从不'
        }
      },
      passion: {
        text: '您对您的工作充满热情',
        options: {
          always: '总是',
          'most-of-the-time': '大多数时候',
          sometimes: '有时',
          rarely: '很少',
          never: '从不'
        }
      },
      pay: {
        text: '考虑到我在工作中的所有付出和成就，我觉得我得到的报酬是合理的',
        options: {
          'strongly-agree': '非常同意',
          'tend-to-agree': '倾向于同意',
          neither: '既不同意也不反对',
          'tend-to-disagree': '倾向于不同意',
          'strongly-disagree': '非常不同意'
        }
      },
      'benefit-to-world': {
        text: '我的工作对社会有用',
        options: {
          'strongly-agree': '非常同意',
          agree: '同意',
          neither: '既不同意也不反对',
          disagree: '不同意',
          'strongly-disagree': '非常不同意',
          'cant-choose': '无法选择'
        }
      },
      'job-choice': {
        text: '您会选择哪份工作？',
        hint: '假设这两份工作都向您发出了录用通知。请选择您更想要的那一份。',
        attributes: {
          pay: {
            label: '薪酬',
            levels: {
              'less-30': {
                label: '比现在少 30%',
                short: '降薪 30%'
              },
              'less-15': {
                label: '比现在少 15%',
                short: '降薪 15%'
              },
              same: {
                label: '与现在相同',
                short: '薪酬不变'
              },
              'more-15': {
                label: '比现在多 15%',
                short: '加薪 15%'
              },
              'more-30': {
                label: '比现在多 30%',
                short: '加薪 30%'
              }
            }
          },
          mission: {
            label: '使命',
            levels: {
              commercial: {
                label: '帮助企业发展'
              },
              'some-good': {
                label: '对社会有一定益处'
              },
              'for-good': {
                label: '直接为世界做好事'
              }
            }
          },
          organisation: {
            label: '组织',
            levels: {
              startup: {
                label: '早期初创公司',
                noun: '初创公司'
              },
              established: {
                label: '成熟公司',
                noun: '公司'
              },
              public: {
                label: '公共部门',
                noun: '政府部门'
              },
              nonprofit: {
                label: '非营利组织或慈善机构',
                noun: '慈善机构'
              }
            }
          },
          brand: {
            label: '品牌',
            levels: {
              household: {
                label: '家喻户晓的品牌',
                shortFor: {
                  startup: '知名初创公司',
                  established: '知名公司',
                  public: '知名政府部门',
                  nonprofit: '知名慈善机构'
                }
              },
              industry: {
                label: '品牌在其领域内知名',
                shortFor: {
                  startup: '初创公司在其领域内知名',
                  established: '公司在其领域内知名',
                  public: '政府部门在其领域内知名',
                  nonprofit: '慈善机构在其领域内知名'
                }
              },
              unknown: {
                label: '鲜为人知的品牌',
                shortFor: {
                  startup: '鲜为人知的初创公司',
                  established: '鲜为人知的公司',
                  public: '鲜为人知的政府部门',
                  nonprofit: '鲜为人知的慈善机构'
                }
              }
            }
          },
          work: {
            label: '工作内容',
            levels: {
              ai: {
                label: '前沿 AI 产品',
                short: '打造前沿 AI'
              },
              established: {
                label: '成熟的产品',
                short: '改进成熟的产品'
              },
              new: {
                label: '新产品开发',
                short: '开发新产品'
              }
            }
          }
        },
        cardTitles: [
          '大公司职位',
          '企业职位',
          '初创公司职位',
          '政府职位',
          '慈善机构职位'
        ]
      },
      'what-matters': {
        text: '对您来说最重要的 2–3 项是什么？',
        options: {
          craft: '专业技艺',
          purpose: '使命感',
          autonomy: '自主权',
          money: '金钱',
          'business-impact': '商业影响',
          'work-life-balance': '工作与生活的平衡',
          recognition: '认可',
          'creative-freedom': '创作自由',
          'great-team': '优秀的团队',
          'great-manager': '优秀的上级',
          'career-growth': '职业发展'
        }
      },
      feelings: {
        text: '哪些词最能概括您对自己职业的感受？',
        hint: '可多选',
        options: {
          optimistic: '乐观',
          excited: '兴奋',
          confident: '自信',
          grateful: '感恩',
          fulfilled: '有成就感',
          curious: '好奇',
          comfortable: '安逸',
          restless: '躁动不安',
          uncertain: '不确定',
          mixed: '百感交集',
          anxious: '焦虑',
          frustrated: '沮丧',
          exhausted: '精疲力竭',
          undervalued: '不受重视',
          disillusioned: '幻灭'
        }
      },
      metaphor: {
        text: '2026 年的{Subject}，感觉就像……',
        hint: '请把这句话补充完整。'
      },
      'still-here-in-5': {
        text: '五年后您仍在{term}领域工作的可能性有多大？',
        labels: [
          '不会在这一领域工作',
          '很可能不会',
          '倾向于离开',
          '倾向于留下',
          '很可能会',
          '一定仍在这一领域工作'
        ]
      },
      'would-recommend': {
        text: '您会向比您年轻的朋友推荐从事{term}职业吗？',
        options: {
          yes: '会',
          no: '不会'
        }
      },
      'work-you-hoped-for': {
        text: '回想一下您当初入行的原因。您现在做的是您曾经希望做的那种工作吗？',
        options: {
          yes: '是',
          no: '不是'
        }
      },
      burnout: {
        text: '您有多经常因工作而感到倦怠（burnout）？',
        options: {
          never: '从不',
          rarely: '很少',
          sometimes: '有时',
          often: '经常',
          always: '总是'
        }
      },
      'proud-of-shipping': {
        text: '您今年推出的成果中，有让您感到自豪的吗？',
        options: {
          yes: '有',
          no: '没有'
        }
      },
      'ai-usage': {
        text: '在您的日常工作中，AI 的使用程度如何？',
        labels: [
          '我从不使用 AI',
          '我很少使用 AI',
          '我偶尔使用 AI',
          '我经常使用 AI',
          '我每天都使用 AI',
          '我大部分时间都在使用 AI'
        ]
      },
      'ai-feelings': {
        text: '您如何看待工作中的 AI？',
        hint: '可多选',
        options: {
          'took-the-fun': '夺走了工作中有趣的部分',
          'freed-me-up': '让我腾出精力专注于重要的事',
          'more-productive': '让我更有效率',
          'reduced-quality': '降低了质量',
          'improved-quality': '提高了质量',
          'replaced-me': '取代了我',
          isolated: '感到孤立',
          'improved-skills': '提升了我的技能',
          other: '其他……'
        }
      },
      'manages-people': {
        text: '您是否管理他人？',
        options: {
          yes: '是',
          no: '否'
        }
      },
      experience: {
        text: '您从事专业工作多久了？',
        options: {
          student: '学生',
          'recent-graduate': '刚毕业',
          '1-4': '1–4 年',
          '5-9': '5–9 年',
          '10-19': '10–19 年',
          '20-plus': '20+ 年'
        }
      },
      country: {
        text: '您身在世界哪个地方？'
      },
      'org-size': {
        text: '您所在的公司或组织规模有多大？',
        options: {
          '1': '只有我一人',
          '2-9': '2–9',
          '10-49': '10–49',
          '50-249': '50–249',
          '250-999': '250–999',
          '1000-plus': '1,000+'
        }
      },
      'designer-pm-count': {
        text: '您所在的公司或组织有多少设计师和产品经理？',
        options: {
          '1-4': '1–4',
          '5-9': '5–9',
          '10-19': '10–19',
          '20-49': '20–49',
          '50-plus': '50+'
        }
      },
      'org-type': {
        text: '您在哪种类型的组织工作？',
        hint: '请选择最符合您的一项。',
        options: {
          startup: '初创公司',
          'scale-up': '快速成长期公司（Scale-up）',
          'big-tech': '大型科技公司',
          enterprise: '大型企业',
          agency: '代理公司（Agency）',
          'in-house': '非科技公司的内部团队',
          'public-sector': '公共部门',
          nonprofit: '非营利组织',
          'self-employed': '自雇／自由职业',
          other: '其他……'
        }
      },
      sectors: {
        text: '您主要在哪些行业工作？',
        hint: '可多选',
        options: {
          government: '政府',
          'enterprise-software': '企业软件',
          'developer-tools': '开发者工具',
          media: '媒体或出版',
          gaming: '游戏',
          hospitality: '酒店与餐饮',
          education: '教育',
          health: '医疗健康',
          ai: 'AI',
          finance: '金融',
          ecommerce: '电子商务',
          nonprofit: '非营利或慈善',
          telecommunications: '电信',
          'consumer-tech': '消费科技',
          automotive: '汽车',
          other: '其他……'
        }
      },
      'one-change': {
        text: '如果能改变我们行业的一件事，您会改变什么？'
      },
      admire: {
        text: '在您的领域里，您敬佩谁？为什么？'
      },
      'amazing-work': {
        text: '有哪个项目或组织让您觉得很了不起？'
      }
    }
  },
  ui: {
    languagePicker: '选择语言',
    band: '我们是一家非营利组织，帮助设计师投身于解决世界上的紧迫问题。',
    kicker: '调查',
    start: {
      beforeYouStart: '开始之前',
      minutes: '约需 {minutes} 分钟完成',
      anonymous: '回答是匿名的',
      book: '您有机会赢得一本免费的书（见下文）',
      progress: '您的进度会保存在此浏览器中，您可以随时中断，稍后再回来继续',
      button: '开始调查',
      privacyHeading: '您的隐私',
      privacy: [
        '所有回答都是匿名的。我们不会询问您的身份，也不会记录您的 IP 地址。',
        '我们从不索取您的电子邮箱地址。调查不会存储任何可用于识别回答者身份的信息。',
        '如需获取调查结果，请在最后订阅我们的邮件通讯。我们会知道您是通过本调查订阅的，但您的电子邮箱绝不会与您的回答关联。'
      ],
      privacyLine: '有关我们如何处理这些数据，请参阅我们的{link}（英文）。',
      privacyLinkText: '隐私声明'
    },
    closed: {
      opensOn: '本调查将于 {date} 开放。',
      closedOn: '本调查已于 {date} 结束，不再接受回答。感谢所有参与者。',
      hearWhenOpens: '{link}，以便在调查开放及结果发布时收到通知。',
      hearResults: '{link}，以便在结果发布时收到通知。',
      newsletterLinkText: '订阅邮件通讯'
    },
    header: {
      exit: '退出',
      exitRest: '调查',
      surveyBy: '调查 · 由 {logo} 发起',
      privacy: '隐私',
      privacyRest: '政策',
      back: '返回',
      step: '第 {n} 步，共 {total} 步'
    },
    actions: {
      continue: '继续',
      send: '提交我的回答',
      sending: '正在提交……',
      done: '完成',
      skip: '跳过此题'
    },
    errors: {
      generic: '出了点问题。请稍后再试。',
      network: '无法连接到服务器。请重试。',
      tooMany: '请求过多。请稍后再试。',
      closed: '本调查已结束。',
      saveFailed: '无法保存您的回答。请重试。',
      bonusExpired: '这些内容已无法再添加到您的回答中。仍然感谢您。',
      withQuestion: '“{question}”：{message}'
    },
    validation: {
      answerAgain: '请重新回答此题。',
      answer: '请回答此题。',
      answerNamed: '请回答“{question}”',
      chooseOne: '请选择一个选项。',
      chooseFromOptions: '请从选项中选择一项。',
      chooseAtLeastOne: '请至少选择一个选项。',
      chooseOnce: '每个选项只能选择一次。',
      chooseListed: '请从所列选项中选择。',
      chooseRating: '请选择一个评分。',
      makeAllChoices: '请完成全部 {n} 次选择。',
      chooseJobsShown: '请从所显示的工作中选择。',
      chooseCountry: '请选择一个国家或地区。',
      chooseCountryFromList: '请从列表中选择一个国家或地区。',
      write: '请填写回答。',
      specialCharacters: '请删除所有特殊字符。',
      formulaStart: '回答请勿以 =、+、- 或 @ 开头。',
      tooLong: '请将字数控制在 {n} 个字符以内。',
      sayOther: '请说明您所说的“其他”是指什么。'
    },
    fields: {
      chooseOne: '请选择一项',
      chooseCountry: '选择国家或地区',
      sayMore: '请具体说明',
      optional: '选填',
      charsRemaining: {
        other: '还可输入 {n} 个字符'
      }
    },
    jobs: {
      caption: '两份工作。请选择您会接受的那一份。',
      firstJob: '第一份工作',
      secondJob: '第二份工作',
      typeOfJob: '工作类型',
      and: '、',
      choose: '选择',
      chooseFirst: '选择第一份工作',
      chooseSecond: '选择第二份工作',
      vs: 'vs.',
      round: '第 {n} 轮，共 {total} 轮',
      undo: '撤销上一次选择',
      allDone: '全部 {n} 轮已完成',
      again: '返回并重新选择工作'
    },
    prize: {
      heading: '赢取一本免费的书',
      startBody:
        '完成调查后订阅 Hard Problems 邮件通讯，您就有机会成为我们赠送 {authors} 所著《{title}》的 {copies} 人之一。',
      doneBody:
        '邮件通讯订阅者将参加抽奖，有机会获得 {copies} 本 {authors} 所著《{title}》中的一本。',
      reviewLink: '阅读我们对这本书的书评',
      draw: '调查于 {date} 结束后，我们将从邮件通讯订阅者中随机抽取 {copies} 人。',
      thanks: '感谢 Scott and Bryan 赠送这些书供我们发放。',
      coverAlt: '{authors} 所著《{title}》的封面',
      termsSummary: '抽奖条款',
      termsNote: '本条款为译文。如与英文版本有出入，以英文版本为准。',
      terms: [
        '主办方为 Hard Problems，一家在英格兰和威尔士注册的担保有限责任非营利公司，公司编号 16028166。',
        '无需购买。参加免费。',
        '凡年满 18 周岁者均可参加抽奖，但我们的董事、员工、承包商及其直系亲属除外。在当地法律禁止的地区，本抽奖无效。',
        '参加方式：在 {date} 当天或之前订阅 Hard Problems 邮件通讯。我们请您先完成调查，但由于调查回答是匿名的，我们无法核实您是否已完成，我们也不会核实。在该日期已订阅的现有订阅者将自动参加。每人限参加一次。',
        '共有 {copies} 份奖品。每份奖品为一本 {authors} 所著的《{title}》。奖品不可兑换现金，且不可转让。',
        '中奖者将在截止日期后 14 天内从所有符合条件的参与者中随机抽取，并通过其订阅时使用的电子邮箱地址联系。',
        '中奖者须在 28 天内回复邮寄地址。如未回复，我们将另行抽取替补中奖者。',
        '我们自费向全球邮寄奖品。任何进口关税或当地税费由中奖者承担。',
        '我们仅将中奖者的电子邮箱和邮寄地址用于寄送奖品，并在奖品寄出后删除邮寄地址。请参阅我们的{link}（英文）。',
        '{authors} 慷慨捐赠了这些书。抽奖完全由 Hard Problems 负责；作者及其出版商均不管理抽奖，也不选择中奖者。',
        '参加即表示接受这些条款。本抽奖受英格兰和威尔士法律管辖。'
      ],
      privacyLinkText: '隐私声明'
    },
    done: {
      title: '谢谢您！',
      resultsHeading: '12 月获取调查结果',
      resultsBody:
        '我们没有索取您的电子邮箱，因此您的回答保持匿名。如需在报告发布时收到通知，请订阅我们的{link}。',
      newsletterLinkText: '邮件通讯',
      shareHeading: '帮助我们触达更多人',
      shareBody: '请在社交媒体上分享此链接。参与调查的人越多，报告就越好。',
      shareText:
        '我刚刚参加了 Hard Problems 关于设计和产品职业的调查。一起来看看我们认为什么样的职业令人满意吧。{url} 欢迎转发。',
      copy: '复制文字',
      copied: '已复制',
      shareOr: '或分享到',
      shareOn: '分享到 {name}',
      emailSubject: '一项关于设计和产品职业的调查'
    },
    newsletter: {
      placeholder: '您的电子邮箱……',
      emailLabel: '您的电子邮箱地址',
      subscribe: '订阅',
      subscribing: '正在订阅',
      successTitle: '谢谢您',
      successBody: '您已成功订阅。',
      errorTitle: '出了点问题',
      errorBody: '无法为您订阅。请重试。',
      networkError: '无法连接到邮件通讯服务。请重试。',
      done: '完成',
      tryAgain: '重试',
      close: '关闭'
    }
  }
};

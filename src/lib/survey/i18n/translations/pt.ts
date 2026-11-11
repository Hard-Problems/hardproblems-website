// Brazilian Portuguese translation of the 2026 survey. See ../types.ts.
import type { SurveyTranslation } from '../types';

export const pt: SurveyTranslation = {
  code: 'pt',
  content: {
    title: 'O que queremos do trabalho: uma pesquisa de design e produto',
    shortTitle: 'O que queremos do trabalho',
    intro:
      'Uma pesquisa para profissionais de design, pesquisa, escrita e produto sobre como se sentem em relação à carreira.',
    why: [
      'Há muitos dados sobre o que as empresas querem de designers e PMs, e quase nenhum sobre o que designers e PMs querem da própria carreira. Ajude a mudar isso. O que realmente faz as pessoas se sentirem satisfeitas com o trabalho?',
      'No nosso relatório, vamos tentar mostrar onde as pessoas encontram alegria e orgulho na nossa área.'
    ],
    roleTerms: {
      'product-designer': 'design',
      'graphic-designer': 'design',
      'brand-designer': 'design',
      illustrator: 'ilustração',
      'motion-designer': 'motion design',
      'service-designer': 'design de serviços',
      'industrial-designer': 'design',
      'design-researcher': 'pesquisa com usuários',
      'ux-designer': 'design',
      'ui-designer': 'design',
      'design-writer': 'escrita',
      'product-manager': 'gestão de produto',
      founder: 'sua organização',
      other: 'sua área'
    },
    roleSubjects: {
      founder: 'ser fundador(a)',
      other: 'minha carreira'
    },
    roleQuestionText: {
      'product-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      'graphic-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      'brand-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      illustrator: {
        metaphor: 'A ilustração em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com ilustração daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em ilustração a um amigo ou amiga mais jovem?'
      },
      'motion-designer': {
        metaphor: 'O motion design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com motion design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em motion design a um amigo ou amiga mais jovem?'
      },
      'service-designer': {
        metaphor: 'O design de serviços em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design de serviços daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design de serviços a um amigo ou amiga mais jovem?'
      },
      'industrial-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      'design-researcher': {
        metaphor: 'A pesquisa com usuários em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com pesquisa com usuários daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em pesquisa com usuários a um amigo ou amiga mais jovem?'
      },
      'ux-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      'ui-designer': {
        metaphor: 'O design em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com design daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em design a um amigo ou amiga mais jovem?'
      },
      'design-writer': {
        metaphor: 'A escrita em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com escrita daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em escrita a um amigo ou amiga mais jovem?'
      },
      'product-manager': {
        metaphor: 'A gestão de produto em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando com gestão de produto daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira em gestão de produto a um amigo ou amiga mais jovem?'
      },
      founder: {
        metaphor: 'Ser fundador(a) em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar à frente da sua própria organização daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria a um amigo ou amiga mais jovem se tornar fundador(a)?'
      },
      other: {
        metaphor: 'Minha carreira em 2026 parece…',
        'still-here-in-5':
          'Qual a probabilidade de você ainda estar trabalhando na sua área daqui a cinco anos?',
        'would-recommend':
          'Você recomendaria uma carreira na sua área a um amigo ou amiga mais jovem?'
      }
    },
    defaultTerm: 'design',
    groups: {
      'about-you': {
        title: 'Sobre você e onde você trabalha'
      },
      bonus: {
        title: 'Rodada bônus',
        hint: 'Suas respostas estão salvas.'
      }
    },
    questions: {
      role: {
        text: 'Qual é o seu tipo de cargo?',
        hint: 'Escolha o que melhor se aplica a você.',
        options: {
          'product-designer': 'Product designer (produto digital)',
          'graphic-designer': 'Designer gráfico(a)',
          'brand-designer': 'Designer de marca',
          illustrator: 'Ilustrador(a)',
          'motion-designer': 'Motion designer',
          'service-designer': 'Designer de serviços',
          'industrial-designer': 'Designer industrial',
          'design-researcher': 'Pesquisador(a) de usuários (UX researcher)',
          'ux-designer': 'UX designer',
          'ui-designer': 'UI designer',
          'design-writer': 'Redator(a)',
          'product-manager': 'Product manager',
          founder: 'Fundador(a)/negócio próprio',
          other: 'Outro…'
        }
      },
      'career-satisfaction': {
        text: 'Quão satisfeito(a) você está com o seu trabalho (principal)?',
        options: {
          'completely-satisfied': 'Completamente satisfeito(a)',
          'very-satisfied': 'Muito satisfeito(a)',
          'fairly-satisfied': 'Razoavelmente satisfeito(a)',
          neither: 'Nem satisfeito(a) nem insatisfeito(a)',
          'fairly-dissatisfied': 'Razoavelmente insatisfeito(a)',
          'very-dissatisfied': 'Muito insatisfeito(a)',
          'completely-dissatisfied': 'Completamente insatisfeito(a)',
          'cant-choose': 'Não consigo escolher'
        }
      },
      'role-security': {
        text: 'Quão estável você sente que é o seu cargo atual?',
        labels: [
          'Muito instável',
          'Razoavelmente instável',
          'Um pouco instável',
          'Um pouco estável',
          'Razoavelmente estável',
          'Sólido como uma rocha'
        ]
      },
      skill: {
        text: 'Na minha opinião, sou bom/boa no meu trabalho',
        options: {
          always: 'Sempre',
          'most-of-the-time': 'Na maior parte do tempo',
          sometimes: 'Às vezes',
          rarely: 'Raramente',
          never: 'Nunca'
        }
      },
      passion: {
        text: 'Você tem entusiasmo pelo seu trabalho',
        options: {
          always: 'Sempre',
          'most-of-the-time': 'Na maior parte do tempo',
          sometimes: 'Às vezes',
          rarely: 'Raramente',
          never: 'Nunca'
        }
      },
      pay: {
        text: 'Considerando todos os meus esforços e conquistas no trabalho, sinto que sou pago(a) de forma adequada',
        options: {
          'strongly-agree': 'Concordo totalmente',
          'tend-to-agree': 'Tendo a concordar',
          neither: 'Nem concordo nem discordo',
          'tend-to-disagree': 'Tendo a discordar',
          'strongly-disagree': 'Discordo totalmente'
        }
      },
      'benefit-to-world': {
        text: 'Meu trabalho é útil para a sociedade',
        options: {
          'strongly-agree': 'Concordo totalmente',
          agree: 'Concordo',
          neither: 'Nem concordo nem discordo',
          disagree: 'Discordo',
          'strongly-disagree': 'Discordo totalmente',
          'cant-choose': 'Não consigo escolher'
        }
      },
      'job-choice': {
        text: 'Qual vaga você aceitaria?',
        hint: 'Imagine que você recebeu as duas ofertas. Escolha a que você preferiria.',
        attributes: {
          pay: {
            label: 'Salário',
            levels: {
              'less-30': {
                label: '30% a menos que hoje',
                short: 'Salário 30% menor'
              },
              'less-15': {
                label: '15% a menos que hoje',
                short: 'Salário 15% menor'
              },
              same: {
                label: 'O mesmo de hoje',
                short: 'Mesmo salário'
              },
              'more-15': {
                label: '15% a mais que hoje',
                short: 'Salário 15% maior'
              },
              'more-30': {
                label: '30% a mais que hoje',
                short: 'Salário 30% maior'
              }
            }
          },
          mission: {
            label: 'Missão',
            levels: {
              commercial: {
                label: 'Ajuda empresas a crescer'
              },
              'some-good': {
                label: 'Algum benefício para a sociedade'
              },
              'for-good': {
                label: 'Faz o bem diretamente no mundo'
              }
            }
          },
          organisation: {
            label: 'Organização',
            levels: {
              startup: {
                label: 'Startup em estágio inicial',
                noun: 'startup'
              },
              established: {
                label: 'Empresa consolidada',
                noun: 'empresa'
              },
              public: {
                label: 'Setor público',
                noun: 'órgão público'
              },
              nonprofit: {
                label: 'ONG ou organização sem fins lucrativos',
                noun: 'ONG'
              }
            }
          },
          brand: {
            label: 'Marca',
            levels: {
              household: {
                label: 'Um nome que todo mundo conhece',
                shortFor: {
                  startup: 'Startup muito conhecida',
                  established: 'Empresa muito conhecida',
                  public: 'Órgão público muito conhecido',
                  nonprofit: 'ONG muito conhecida'
                }
              },
              industry: {
                label: 'Marca reconhecida na sua área',
                shortFor: {
                  startup: 'Startup reconhecida na sua área',
                  established: 'Empresa reconhecida na sua área',
                  public: 'Órgão público reconhecido na sua área',
                  nonprofit: 'ONG reconhecida na sua área'
                }
              },
              unknown: {
                label: 'Marca pouco conhecida',
                shortFor: {
                  startup: 'Startup pouco conhecida',
                  established: 'Empresa pouco conhecida',
                  public: 'Órgão público pouco conhecido',
                  nonprofit: 'ONG pouco conhecida'
                }
              }
            }
          },
          work: {
            label: 'O trabalho',
            levels: {
              ai: {
                label: 'Produtos de IA de ponta',
                short: 'Construir IA de ponta'
              },
              established: {
                label: 'Um produto consolidado',
                short: 'Melhorar um produto consolidado'
              },
              new: {
                label: 'Desenvolvimento de novos produtos',
                short: 'Desenvolver um produto novo'
              }
            }
          }
        },
        cardTitles: [
          'Vaga em grande empresa',
          'Vaga corporativa',
          'Vaga em startup',
          'Vaga no governo',
          'Vaga em ONG'
        ]
      },
      'what-matters': {
        text: 'Quais 2–3 itens mais importam para você?',
        options: {
          craft: 'Domínio do ofício',
          purpose: 'Propósito',
          autonomy: 'Autonomia',
          money: 'Dinheiro',
          'business-impact': 'Impacto no negócio',
          'work-life-balance': 'Equilíbrio entre vida pessoal e trabalho',
          recognition: 'Reconhecimento',
          'creative-freedom': 'Liberdade criativa',
          'great-team': 'Ótima equipe',
          'great-manager': 'Ótima liderança',
          'career-growth': 'Crescimento na carreira'
        }
      },
      feelings: {
        text: 'O que melhor descreve o que você sente sobre a sua carreira?',
        hint: 'Múltipla escolha',
        options: {
          optimistic: 'Otimista',
          excited: 'Empolgado(a)',
          confident: 'Confiante',
          grateful: 'Grato(a)',
          fulfilled: 'Realizado(a)',
          curious: 'Curioso(a)',
          comfortable: 'Confortável',
          restless: 'Inquieto(a)',
          uncertain: 'Incerto(a)',
          mixed: 'Sentimentos mistos',
          anxious: 'Ansioso(a)',
          frustrated: 'Frustrado(a)',
          exhausted: 'Exausto(a)',
          undervalued: 'Desvalorizado(a)',
          disillusioned: 'Desiludido(a)'
        }
      },
      metaphor: {
        text: '{Subject} em 2026 parece…',
        hint: 'Complete a frase.'
      },
      'still-here-in-5': {
        text: 'Qual a probabilidade de você ainda estar trabalhando com {term} daqui a cinco anos?',
        labels: [
          'Não estarei trabalhando nesta área',
          'Provavelmente não',
          'Inclinado(a) a sair',
          'Inclinado(a) a ficar',
          'Provavelmente sim',
          'Com certeza estarei trabalhando nesta área'
        ]
      },
      'would-recommend': {
        text: 'Você recomendaria uma carreira em {term} a um amigo ou amiga mais jovem?',
        options: {
          yes: 'Sim',
          no: 'Não'
        }
      },
      'work-you-hoped-for': {
        text: 'Pense no motivo pelo qual você começou. Você está fazendo o tipo de trabalho que esperava fazer?',
        options: {
          yes: 'Sim',
          no: 'Não'
        }
      },
      burnout: {
        text: 'Com que frequência você se sente esgotado(a) pelo seu trabalho?',
        options: {
          never: 'Nunca',
          rarely: 'Raramente',
          sometimes: 'Às vezes',
          often: 'Frequentemente',
          always: 'Sempre'
        }
      },
      'proud-of-shipping': {
        text: 'Você tem orgulho de algo que criou este ano?',
        options: {
          yes: 'Sim',
          no: 'Não'
        }
      },
      'ai-usage': {
        text: 'Quanto a IA está sendo usada no seu trabalho do dia a dia?',
        labels: [
          'Nunca uso IA',
          'Raramente uso IA',
          'Uso IA ocasionalmente',
          'Uso IA regularmente',
          'Uso IA diariamente',
          'Uso IA na maior parte do tempo'
        ]
      },
      'ai-feelings': {
        text: 'Como você se sente em relação à IA no seu trabalho?',
        hint: 'Múltipla escolha',
        options: {
          'took-the-fun': 'Tirou as partes divertidas',
          'freed-me-up': 'Me liberou para focar no que importa',
          'more-productive': 'Me permite ser mais produtivo(a)',
          'reduced-quality': 'Reduziu a qualidade',
          'improved-quality': 'Melhorou a qualidade',
          'replaced-me': 'Me substituiu',
          isolated: 'Me sinto isolado(a)',
          'improved-skills': 'Melhorou minhas habilidades',
          other: 'Outro…'
        }
      },
      'manages-people': {
        text: 'Você faz gestão de pessoas?',
        options: {
          yes: 'Sim',
          no: 'Não'
        }
      },
      experience: {
        text: 'Há quanto tempo você trabalha profissionalmente?',
        options: {
          student: 'Estudante',
          'recent-graduate': 'Recém-formado(a)',
          '1-4': '1–4 anos',
          '5-9': '5–9 anos',
          '10-19': '10–19 anos',
          '20-plus': '20+ anos'
        }
      },
      country: {
        text: 'Em que lugar do mundo você está?'
      },
      'org-size': {
        text: 'Qual é o tamanho da sua empresa ou organização?',
        options: {
          '1': 'Só eu',
          '2-9': '2–9',
          '10-49': '10–49',
          '50-249': '50–249',
          '250-999': '250–999',
          '1000-plus': '1.000+'
        }
      },
      'designer-pm-count': {
        text: 'Quantos designers e PMs trabalham na sua empresa ou organização?',
        options: {
          '1-4': '1–4',
          '5-9': '5–9',
          '10-19': '10–19',
          '20-49': '20–49',
          '50-plus': '50+'
        }
      },
      'org-type': {
        text: 'Em que tipo de organização você trabalha?',
        hint: 'Escolha o que melhor se aplica a você.',
        options: {
          startup: 'Startup',
          'scale-up': 'Scale-up',
          'big-tech': 'Big tech',
          enterprise: 'Grande empresa',
          agency: 'Agência',
          'in-house': 'Time interno em uma empresa que não é de tecnologia',
          'public-sector': 'Setor público',
          nonprofit: 'Sem fins lucrativos',
          'self-employed': 'Autônomo(a)',
          other: 'Outro…'
        }
      },
      sectors: {
        text: 'Quais são os principais setores em que você trabalha?',
        hint: 'Múltipla escolha',
        options: {
          government: 'Governo',
          'enterprise-software': 'Software corporativo',
          'developer-tools': 'Ferramentas para desenvolvedores',
          media: 'Mídia ou editorial',
          gaming: 'Games',
          hospitality: 'Hotelaria e restaurantes',
          education: 'Educação',
          health: 'Saúde',
          ai: 'IA',
          finance: 'Finanças',
          ecommerce: 'E-commerce',
          nonprofit: 'ONG ou sem fins lucrativos',
          telecommunications: 'Telecomunicações',
          'consumer-tech': 'Tecnologia de consumo',
          automotive: 'Automotivo',
          other: 'Outro…'
        }
      },
      'one-change': {
        text: 'Uma coisa que você mudaria na nossa área?'
      },
      admire: {
        text: 'Quem você admira na sua área? Por quê?'
      },
      'amazing-work': {
        text: 'Qual é um projeto ou organização que você acha incrível?'
      }
    }
  },
  ui: {
    languagePicker: 'Escolha um idioma',
    band: 'Somos uma organização sem fins lucrativos que ajuda designers a trabalhar nos problemas urgentes do mundo.',
    kicker: 'Pesquisa',
    start: {
      beforeYouStart: 'Antes de começar',
      minutes: '~{minutes} minutos para responder',
      anonymous: 'As respostas são anônimas',
      book: 'Você pode ganhar um livro grátis (veja abaixo)',
      progress:
        'Seu progresso fica salvo neste navegador, então você pode parar e voltar depois',
      button: 'Começar a pesquisa',
      privacyHeading: 'Sua privacidade',
      privacy: [
        'Todas as respostas são anônimas. Não perguntamos quem você é e não registramos o seu endereço IP.',
        'Nunca pedimos o seu e-mail. A pesquisa não guarda nenhuma forma de saber quem enviou uma resposta.',
        'Para receber os resultados, assine a nossa newsletter no final. Saberemos que você se inscreveu pela pesquisa, mas o seu e-mail nunca é vinculado ao que você respondeu.'
      ],
      privacyLine:
        'Veja o nosso {link} (em inglês) para saber como tratamos esses dados.',
      privacyLinkText: 'aviso de privacidade'
    },
    closed: {
      opensOn: 'Esta pesquisa abre em {date}.',
      closedOn:
        'Esta pesquisa foi encerrada em {date} e não está mais aceitando respostas. Obrigado a todas as pessoas que participaram.',
      hearWhenOpens:
        '{link} para saber quando ela abrir e quando os resultados forem publicados.',
      hearResults: '{link} para saber quando os resultados forem publicados.',
      newsletterLinkText: 'Assine a newsletter'
    },
    header: {
      exit: 'Sair',
      exitRest: ' da pesquisa',
      surveyBy: 'pesquisa da {logo}',
      privacy: 'Privacidade',
      privacyRest: '',
      back: 'Voltar',
      step: 'Etapa {n} de {total}'
    },
    actions: {
      continue: 'Continuar',
      send: 'Enviar minhas respostas',
      sending: 'Enviando…',
      done: 'Concluir',
      skip: 'Pular esta pergunta'
    },
    errors: {
      generic: 'Algo deu errado. Tente novamente em instantes.',
      network: 'Não conseguimos acessar o servidor. Tente novamente.',
      tooMany: 'Muitas solicitações. Tente novamente daqui a pouco.',
      closed: 'Esta pesquisa está encerrada.',
      saveFailed: 'Não conseguimos salvar suas respostas. Tente novamente.',
      bonusExpired:
        'Não é mais possível adicionar estas respostas às suas. Obrigado mesmo assim.',
      withQuestion: '“{question}”: {message}'
    },
    validation: {
      answerAgain: 'Responda esta pergunta novamente.',
      answer: 'Responda esta pergunta.',
      answerNamed: 'Responda “{question}”',
      chooseOne: 'Escolha uma opção.',
      chooseFromOptions: 'Escolha uma das opções.',
      chooseAtLeastOne: 'Escolha pelo menos uma opção.',
      chooseOnce: 'Escolha cada opção apenas uma vez.',
      chooseListed: 'Escolha entre as opções listadas.',
      chooseRating: 'Escolha uma avaliação.',
      makeAllChoices: 'Faça todas as {n} escolhas.',
      chooseJobsShown: 'Escolha entre as vagas mostradas.',
      chooseCountry: 'Escolha um país.',
      chooseCountryFromList: 'Escolha um país da lista.',
      write: 'Escreva uma resposta.',
      specialCharacters: 'Remova os caracteres especiais.',
      formulaStart: 'Não comece sua resposta com =, +, - ou @.',
      tooLong: 'Use menos de {n} caracteres.',
      sayOther: 'Diga o que você quer dizer com “Outro”.'
    },
    fields: {
      chooseOne: 'Escolha uma opção',
      chooseCountry: 'Escolha um país',
      sayMore: 'Conte mais',
      optional: 'Opcional',
      charsRemaining: {
        one: 'Resta {n} caractere',
        many: 'Restam {n} de caracteres',
        other: 'Restam {n} caracteres'
      }
    },
    jobs: {
      caption: 'Duas vagas. Escolha a que você aceitaria.',
      firstJob: 'Primeira vaga',
      secondJob: 'Segunda vaga',
      typeOfJob: 'Tipo de vaga',
      and: ' e ',
      choose: 'Escolher',
      chooseFirst: 'Escolher a primeira vaga',
      chooseSecond: 'Escolher a segunda vaga',
      vs: 'vs.',
      round: 'Rodada {n} de {total}',
      undo: 'Desfazer a última escolha',
      allDone: 'Todas as {n} rodadas concluídas',
      again: 'Voltar e escolher as vagas novamente'
    },
    prize: {
      heading: 'Ganhe um livro grátis',
      startBody:
        'Termine a pesquisa, depois assine a newsletter da Hard Problems, e você pode ser uma das {copies} pessoas que vão receber um exemplar de {title}, de {authors}.',
      doneBody:
        'Quem assina a newsletter vai participar de um sorteio de um dos {copies} exemplares de {title}, de {authors}.',
      reviewLink: 'Leia a nossa resenha do livro',
      draw: 'Vamos sortear {copies} assinantes da newsletter depois que a pesquisa for encerrada, em {date}.',
      thanks:
        'Obrigado a Scott and Bryan por nos presentearem com os livros para distribuir.',
      coverAlt: 'Capa de {title}, de {authors}',
      termsSummary: 'Regulamento do sorteio',
      termsNote:
        'Esta é uma tradução. Se houver diferença em relação à versão em inglês, prevalece a versão em inglês.',
      terms: [
        'A promotora é a Hard Problems, uma empresa sem fins lucrativos limitada por garantia, registrada na Inglaterra e no País de Gales, número de registro da empresa 16028166.',
        'Não é necessário fazer nenhuma compra. A participação é gratuita.',
        'O sorteio é aberto a qualquer pessoa com 18 anos ou mais, exceto nossos diretores, funcionários e prestadores de serviço e seus familiares próximos. Não é válido onde a legislação local o proibir.',
        'Para participar, assine a newsletter da Hard Problems até {date}, inclusive. Pedimos que você responda à pesquisa primeiro, mas, como as respostas são anônimas, não temos como verificar se você respondeu, e não verificamos. Quem já for assinante nessa data participa automaticamente. Uma participação por pessoa.',
        'Há {copies} prêmios. Cada um é um exemplar de {title}, de {authors}. Não há alternativa em dinheiro, e os prêmios são intransferíveis.',
        'Os vencedores são escolhidos aleatoriamente entre todas as participações válidas em até 14 dias após a data de encerramento e contatados pelo e-mail com que se inscreveram.',
        'Cada vencedor tem 28 dias para responder com um endereço postal. Caso não responda, sorteamos um substituto.',
        'Enviamos os prêmios para qualquer lugar do mundo por nossa conta. Eventuais taxas de importação ou impostos locais são de responsabilidade do vencedor.',
        'Usamos o e-mail e o endereço postal do vencedor apenas para enviar o prêmio e apagamos o endereço postal assim que ele for enviado. Veja o nosso {link} (em inglês).',
        '{authors} gentilmente doaram os livros. O sorteio é realizado inteiramente pela Hard Problems; nem eles nem a editora deles o administram ou escolhem os vencedores.',
        'Participar significa aceitar este regulamento. O sorteio é regido pela legislação da Inglaterra e do País de Gales.'
      ],
      privacyLinkText: 'aviso de privacidade'
    },
    done: {
      title: 'Obrigado!',
      resultsHeading: 'Receba os resultados em dezembro',
      resultsBody:
        'Não pedimos o seu e-mail, então as suas respostas continuam anônimas. Para saber quando o relatório for publicado, assine a nossa {link}.',
      newsletterLinkText: 'newsletter',
      shareHeading: 'Ajude a gente a alcançar mais pessoas',
      shareBody:
        'Compartilhe este link nas redes sociais. Quanto mais pessoas responderem a esta pesquisa, melhor será o relatório.',
      shareText:
        'Acabei de responder à pesquisa da Hard Problems sobre carreiras em design e produto. Vamos descobrir o que, para nós, torna uma carreira satisfatória. {url} Compartilhe também.',
      copy: 'Copiar texto',
      copied: 'Copiado',
      shareOr: 'Ou compartilhe no',
      shareOn: 'Compartilhar no {name}',
      emailSubject: 'Uma pesquisa sobre carreiras em design e produto'
    },
    newsletter: {
      placeholder: 'Seu e-mail...',
      emailLabel: 'Seu endereço de e-mail',
      subscribe: 'Assinar',
      subscribing: 'Assinando',
      successTitle: 'Obrigado',
      successBody: 'Sua assinatura foi confirmada.',
      errorTitle: 'Algo deu errado',
      errorBody: 'Não foi possível concluir a sua assinatura. Tente novamente.',
      networkError:
        'Não conseguimos acessar o serviço da newsletter. Tente novamente.',
      done: 'Concluir',
      tryAgain: 'Tentar novamente',
      close: 'Fechar'
    }
  }
};

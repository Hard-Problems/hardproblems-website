// Spanish translation of the 2026 survey. See ../types.ts.
import type { SurveyTranslation } from '../types';

export const es: SurveyTranslation = {
  code: 'es',
  content: {
    title: 'Lo que queremos del trabajo: una encuesta de diseño y producto',
    shortTitle: 'Lo que queremos del trabajo',
    intro:
      'Una encuesta para profesionales del diseño, la investigación, la redacción y el producto sobre cómo se sienten con respecto a su carrera.',
    why: [
      'Hay muchos datos sobre lo que las empresas quieren de los diseñadores y los PM, y casi ninguno sobre lo que los diseñadores y los PM quieren de su carrera. Ayúdenos a cambiar eso. ¿Qué es lo que realmente hace que las personas se sientan satisfechas con su trabajo?',
      'En nuestro informe intentaremos mostrar dónde encuentran las personas alegría y orgullo en nuestra industria.'
    ],
    roleTerms: {
      'product-designer': 'diseño',
      'graphic-designer': 'diseño',
      'brand-designer': 'diseño',
      illustrator: 'ilustración',
      'motion-designer': 'motion design',
      'service-designer': 'diseño de servicios',
      'industrial-designer': 'diseño',
      'design-researcher': 'investigación de usuarios',
      'ux-designer': 'diseño',
      'ui-designer': 'diseño',
      'design-writer': 'redacción',
      'product-manager': 'gestión de producto',
      founder: 'su organización',
      other: 'su campo'
    },
    roleSubjects: {
      founder: 'ser fundador/a',
      other: 'mi carrera'
    },
    roleQuestionText: {
      'product-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      'graphic-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      'brand-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      illustrator: {
        metaphor: 'La ilustración en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en ilustración dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en ilustración a un amigo o amiga más joven?'
      },
      'motion-designer': {
        metaphor: 'El motion design en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en motion design dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en motion design a un amigo o amiga más joven?'
      },
      'service-designer': {
        metaphor: 'El diseño de servicios en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño de servicios dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño de servicios a un amigo o amiga más joven?'
      },
      'industrial-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      'design-researcher': {
        metaphor: 'La investigación de usuarios en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en investigación de usuarios dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en investigación de usuarios a un amigo o amiga más joven?'
      },
      'ux-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      'ui-designer': {
        metaphor: 'El diseño en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en diseño dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en diseño a un amigo o amiga más joven?'
      },
      'design-writer': {
        metaphor: 'La redacción en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en redacción dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en redacción a un amigo o amiga más joven?'
      },
      'product-manager': {
        metaphor: 'La gestión de producto en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en gestión de producto dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en gestión de producto a un amigo o amiga más joven?'
      },
      founder: {
        metaphor: 'Ser fundador/a en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga dirigiendo su propia organización dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría a un amigo o amiga más joven convertirse en fundador/a?'
      },
      other: {
        metaphor: 'Mi carrera en 2026 se siente como…',
        'still-here-in-5':
          '¿Qué tan probable es que siga trabajando en su campo dentro de cinco años?',
        'would-recommend':
          '¿Le recomendaría una carrera en su campo a un amigo o amiga más joven?'
      }
    },
    defaultTerm: 'diseño',
    groups: {
      'about-you': {
        title: 'Sobre usted y su lugar de trabajo'
      },
      bonus: {
        title: 'Ronda extra',
        hint: 'Sus respuestas ya están guardadas.'
      }
    },
    questions: {
      role: {
        text: '¿Qué tipo de puesto tiene?',
        hint: 'Elija el que mejor lo/la describa.',
        options: {
          'product-designer': 'Diseñador/a de producto digital',
          'graphic-designer': 'Diseñador/a gráfico/a',
          'brand-designer': 'Diseñador/a de marca',
          illustrator: 'Ilustrador/a',
          'motion-designer': 'Motion designer',
          'service-designer': 'Diseñador/a de servicios',
          'industrial-designer': 'Diseñador/a industrial',
          'design-researcher': 'Investigador/a de usuarios',
          'ux-designer': 'Diseñador/a UX',
          'ui-designer': 'Diseñador/a UI',
          'design-writer': 'Redactor/a',
          'product-manager': 'Product manager',
          founder: 'Fundador/a o negocio propio',
          other: 'Otro…'
        }
      },
      'career-satisfaction': {
        text: '¿Qué tan satisfecho/a está con su trabajo (principal)?',
        options: {
          'completely-satisfied': 'Completamente satisfecho/a',
          'very-satisfied': 'Muy satisfecho/a',
          'fairly-satisfied': 'Bastante satisfecho/a',
          neither: 'Ni satisfecho/a ni insatisfecho/a',
          'fairly-dissatisfied': 'Bastante insatisfecho/a',
          'very-dissatisfied': 'Muy insatisfecho/a',
          'completely-dissatisfied': 'Completamente insatisfecho/a',
          'cant-choose': 'No puedo decidirme'
        }
      },
      'role-security': {
        text: '¿Qué tan estable siente su puesto actual?',
        labels: [
          'Muy inestable',
          'Bastante inestable',
          'Ligeramente inestable',
          'Ligeramente estable',
          'Bastante estable',
          'Sólido como una roca'
        ]
      },
      skill: {
        text: 'En mi opinión, soy bueno/a en mi trabajo',
        options: {
          always: 'Siempre',
          'most-of-the-time': 'La mayor parte del tiempo',
          sometimes: 'A veces',
          rarely: 'Rara vez',
          never: 'Nunca'
        }
      },
      passion: {
        text: 'Usted siente entusiasmo por su trabajo',
        options: {
          always: 'Siempre',
          'most-of-the-time': 'La mayor parte del tiempo',
          sometimes: 'A veces',
          rarely: 'Rara vez',
          never: 'Nunca'
        }
      },
      pay: {
        text: 'Considerando todos mis esfuerzos y logros en mi trabajo, siento que me pagan adecuadamente',
        options: {
          'strongly-agree': 'Totalmente de acuerdo',
          'tend-to-agree': 'Tiendo a estar de acuerdo',
          neither: 'Ni de acuerdo ni en desacuerdo',
          'tend-to-disagree': 'Tiendo a estar en desacuerdo',
          'strongly-disagree': 'Totalmente en desacuerdo'
        }
      },
      'benefit-to-world': {
        text: 'Mi trabajo es útil para la sociedad',
        options: {
          'strongly-agree': 'Totalmente de acuerdo',
          agree: 'De acuerdo',
          neither: 'Ni de acuerdo ni en desacuerdo',
          disagree: 'En desacuerdo',
          'strongly-disagree': 'Totalmente en desacuerdo',
          'cant-choose': 'No puedo decidirme'
        }
      },
      'job-choice': {
        text: '¿Qué trabajo aceptaría?',
        hint: 'Imagine que le ofrecen ambos trabajos. Elija el que preferiría.',
        attributes: {
          pay: {
            label: 'Salario',
            levels: {
              'less-30': {
                label: '30% menos que ahora',
                short: '30% menos de salario'
              },
              'less-15': {
                label: '15% menos que ahora',
                short: '15% menos de salario'
              },
              same: {
                label: 'Igual que ahora',
                short: 'Mismo salario'
              },
              'more-15': {
                label: '15% más que ahora',
                short: '15% más de salario'
              },
              'more-30': {
                label: '30% más que ahora',
                short: '30% más de salario'
              }
            }
          },
          mission: {
            label: 'Misión',
            levels: {
              commercial: {
                label: 'Ayuda a las empresas a crecer'
              },
              'some-good': {
                label: 'Algún beneficio para la sociedad'
              },
              'for-good': {
                label: 'Hace el bien directamente en el mundo'
              }
            }
          },
          organisation: {
            label: 'Organización',
            levels: {
              startup: {
                label: 'Startup en etapa temprana',
                noun: 'startup'
              },
              established: {
                label: 'Empresa consolidada',
                noun: 'empresa'
              },
              public: {
                label: 'Sector público',
                noun: 'organismo público'
              },
              nonprofit: {
                label: 'ONG u organización sin fines de lucro',
                noun: 'ONG'
              }
            }
          },
          brand: {
            label: 'Marca',
            levels: {
              household: {
                label: 'Un nombre que todo el mundo conoce',
                shortFor: {
                  startup: 'Startup muy conocida',
                  established: 'Empresa muy conocida',
                  public: 'Organismo público muy conocido',
                  nonprofit: 'ONG muy conocida'
                }
              },
              industry: {
                label: 'Marca reconocida en su ámbito',
                shortFor: {
                  startup: 'Startup reconocida en su ámbito',
                  established: 'Empresa reconocida en su ámbito',
                  public: 'Organismo público reconocido en su ámbito',
                  nonprofit: 'ONG reconocida en su ámbito'
                }
              },
              unknown: {
                label: 'Marca poco conocida',
                shortFor: {
                  startup: 'Startup poco conocida',
                  established: 'Empresa poco conocida',
                  public: 'Organismo público poco conocido',
                  nonprofit: 'ONG poco conocida'
                }
              }
            }
          },
          work: {
            label: 'El trabajo',
            levels: {
              ai: {
                label: 'Productos de IA de vanguardia',
                short: 'Crear IA de vanguardia'
              },
              established: {
                label: 'Un producto consolidado',
                short: 'Mejorar un producto consolidado'
              },
              new: {
                label: 'Desarrollo de nuevos productos',
                short: 'Desarrollar un producto nuevo'
              }
            }
          }
        },
        cardTitles: [
          'Trabajo en una gran empresa',
          'Trabajo corporativo',
          'Trabajo en una startup',
          'Trabajo en el gobierno',
          'Trabajo en una ONG'
        ]
      },
      'what-matters': {
        text: '¿Cuáles 2–3 son las que más le importan?',
        options: {
          craft: 'El oficio',
          purpose: 'Propósito',
          autonomy: 'Autonomía',
          money: 'Dinero',
          'business-impact': 'Impacto en el negocio',
          'work-life-balance': 'Equilibrio entre trabajo y vida personal',
          recognition: 'Reconocimiento',
          'creative-freedom': 'Libertad creativa',
          'great-team': 'Un gran equipo',
          'great-manager': 'Un/a gran jefe/a',
          'career-growth': 'Crecimiento profesional'
        }
      },
      feelings: {
        text: '¿Qué describe mejor lo que siente sobre su carrera?',
        hint: 'Puede elegir varias opciones',
        options: {
          optimistic: 'Optimista',
          excited: 'Entusiasmado/a',
          confident: 'Con confianza',
          grateful: 'Agradecido/a',
          fulfilled: 'Realizado/a',
          curious: 'Curioso/a',
          comfortable: 'Cómodo/a',
          restless: 'Inquieto/a',
          uncertain: 'Con incertidumbre',
          mixed: 'Sentimientos encontrados',
          anxious: 'Ansioso/a',
          frustrated: 'Frustrado/a',
          exhausted: 'Agotado/a',
          undervalued: 'Poco valorado/a',
          disillusioned: 'Desilusionado/a'
        }
      },
      metaphor: {
        text: '{Subject} en 2026 se siente como…',
        hint: 'Complete la frase.'
      },
      'still-here-in-5': {
        text: '¿Qué tan probable es que siga trabajando en {term} dentro de cinco años?',
        labels: [
          'No estaré trabajando en este campo',
          'Probablemente no',
          'Me inclino por irme',
          'Me inclino por quedarme',
          'Probablemente sí',
          'Sin duda estaré trabajando en este campo'
        ]
      },
      'would-recommend': {
        text: '¿Le recomendaría una carrera en {term} a un amigo o amiga más joven?',
        options: {
          yes: 'Sí',
          no: 'No'
        }
      },
      'work-you-hoped-for': {
        text: 'Piense en por qué empezó. ¿Está haciendo el tipo de trabajo que esperaba hacer?',
        options: {
          yes: 'Sí',
          no: 'No'
        }
      },
      burnout: {
        text: '¿Con qué frecuencia se siente quemado/a (burnout) por su trabajo?',
        options: {
          never: 'Nunca',
          rarely: 'Rara vez',
          sometimes: 'A veces',
          often: 'A menudo',
          always: 'Siempre'
        }
      },
      'proud-of-shipping': {
        text: '¿Se siente orgulloso/a de algo que lanzó este año?',
        options: {
          yes: 'Sí',
          no: 'No'
        }
      },
      'ai-usage': {
        text: '¿Cuánto se usa la IA en su trabajo diario?',
        labels: [
          'Nunca uso IA',
          'Rara vez uso IA',
          'Uso IA ocasionalmente',
          'Uso IA con regularidad',
          'Uso IA a diario',
          'Uso IA la mayor parte del tiempo'
        ]
      },
      'ai-feelings': {
        text: '¿Qué siente con respecto a la IA en su trabajo?',
        hint: 'Puede elegir varias opciones',
        options: {
          'took-the-fun': 'Se ha llevado las partes divertidas',
          'freed-me-up': 'Me ha liberado para enfocarme en lo que importa',
          'more-productive': 'Me permite ser más productivo/a',
          'reduced-quality': 'Ha reducido la calidad',
          'improved-quality': 'Ha mejorado la calidad',
          'replaced-me': 'Me ha reemplazado',
          isolated: 'Me siento aislado/a',
          'improved-skills': 'Ha mejorado mis habilidades',
          other: 'Otro…'
        }
      },
      'manages-people': {
        text: '¿Tiene personas a su cargo?',
        options: {
          yes: 'Sí',
          no: 'No'
        }
      },
      experience: {
        text: '¿Cuánto tiempo lleva trabajando profesionalmente?',
        options: {
          student: 'Estudiante',
          'recent-graduate': 'Recién egresado/a',
          '1-4': '1–4 años',
          '5-9': '5–9 años',
          '10-19': '10–19 años',
          '20-plus': '20+ años'
        }
      },
      country: {
        text: '¿En qué parte del mundo se encuentra?'
      },
      'org-size': {
        text: '¿Qué tan grande es su empresa u organización?',
        options: {
          '1': 'Solo yo',
          '2-9': '2–9',
          '10-49': '10–49',
          '50-249': '50–249',
          '250-999': '250–999',
          '1000-plus': '1000+'
        }
      },
      'designer-pm-count': {
        text: '¿Cuántos diseñadores y PM trabajan en su empresa u organización?',
        options: {
          '1-4': '1–4',
          '5-9': '5–9',
          '10-19': '10–19',
          '20-49': '20–49',
          '50-plus': '50+'
        }
      },
      'org-type': {
        text: '¿En qué tipo de organización trabaja?',
        hint: 'Elija la que mejor lo/la describa.',
        options: {
          startup: 'Startup',
          'scale-up': 'Scale-up',
          'big-tech': 'Big tech',
          enterprise: 'Gran empresa',
          agency: 'Agencia',
          'in-house': 'Equipo interno en una empresa no tecnológica',
          'public-sector': 'Sector público',
          nonprofit: 'Sin fines de lucro',
          'self-employed': 'Independiente',
          other: 'Otro…'
        }
      },
      sectors: {
        text: '¿Cuáles son los principales sectores en los que trabaja?',
        hint: 'Puede elegir varias opciones',
        options: {
          government: 'Gobierno',
          'enterprise-software': 'Software empresarial',
          'developer-tools': 'Herramientas para desarrolladores',
          media: 'Medios o editorial',
          gaming: 'Videojuegos',
          hospitality: 'Hotelería y restaurantes',
          education: 'Educación',
          health: 'Salud',
          ai: 'IA',
          finance: 'Finanzas',
          ecommerce: 'Comercio electrónico',
          nonprofit: 'ONG u organización sin fines de lucro',
          telecommunications: 'Telecomunicaciones',
          'consumer-tech': 'Tecnología de consumo',
          automotive: 'Automotriz',
          other: 'Otro…'
        }
      },
      'one-change': {
        text: '¿Qué cambiaría de nuestra industria?'
      },
      admire: {
        text: '¿A quién admira en su campo? ¿Por qué?'
      },
      'amazing-work': {
        text: '¿Qué proyecto u organización le parece increíble?'
      }
    }
  },
  ui: {
    languagePicker: 'Elija un idioma',
    band: 'Somos una organización sin fines de lucro que ayuda a los diseñadores a trabajar en los problemas urgentes del mundo.',
    kicker: 'Encuesta',
    start: {
      beforeYouStart: 'Antes de empezar',
      minutes: '~{minutes} minutos para completarla',
      anonymous: 'Las respuestas son anónimas',
      book: 'Podría ganar un libro gratis (vea más abajo)',
      progress:
        'Su progreso se guarda en este navegador, así que puede detenerse y volver después',
      button: 'Comenzar la encuesta',
      privacyHeading: 'Su privacidad',
      privacy: [
        'Todas las respuestas son anónimas. No le preguntamos quién es y no registramos su dirección IP.',
        'Nunca le pedimos su correo electrónico. La encuesta no guarda ningún dato que permita saber quién envió una respuesta.',
        'Para recibir los resultados, suscríbase a nuestro boletín al final. Sabremos que se suscribió desde la encuesta, pero su correo nunca se vincula con lo que respondió.'
      ],
      privacyLine:
        'Consulte nuestro {link} (en inglés) para saber cómo tratamos estos datos.',
      privacyLinkText: 'aviso de privacidad'
    },
    closed: {
      opensOn: 'Esta encuesta abre el {date}.',
      closedOn:
        'Esta encuesta cerró el {date} y ya no acepta respuestas. Gracias a todas las personas que participaron.',
      hearWhenOpens:
        '{link} para saber cuándo abre y cuándo se publiquen los resultados.',
      hearResults: '{link} para saber cuándo se publiquen los resultados.',
      newsletterLinkText: 'Suscríbase al boletín'
    },
    header: {
      exit: 'Salir',
      exitRest: ' de la encuesta',
      surveyBy: 'encuesta de {logo}',
      privacy: 'Privacidad',
      privacyRest: '',
      back: 'Atrás',
      step: 'Paso {n} de {total}'
    },
    actions: {
      continue: 'Continuar',
      send: 'Enviar mis respuestas',
      sending: 'Enviando…',
      done: 'Listo',
      skip: 'Omitir esta pregunta'
    },
    errors: {
      generic: 'Algo salió mal. Vuelva a intentarlo en un momento.',
      network: 'No pudimos conectar con el servidor. Vuelva a intentarlo.',
      tooMany: 'Demasiadas solicitudes. Vuelva a intentarlo en breve.',
      closed: 'Esta encuesta está cerrada.',
      saveFailed: 'No pudimos guardar sus respuestas. Vuelva a intentarlo.',
      bonusExpired:
        'Ya no es posible agregar estas respuestas a las suyas. De todos modos, gracias.',
      withQuestion: '“{question}”: {message}'
    },
    validation: {
      answerAgain: 'Responda esta pregunta de nuevo.',
      answer: 'Responda esta pregunta.',
      answerNamed: 'Responda “{question}”',
      chooseOne: 'Elija una opción.',
      chooseFromOptions: 'Elija una de las opciones.',
      chooseAtLeastOne: 'Elija al menos una opción.',
      chooseOnce: 'Elija cada opción solo una vez.',
      chooseListed: 'Elija entre las opciones de la lista.',
      chooseRating: 'Elija una calificación.',
      makeAllChoices: 'Haga las {n} elecciones.',
      chooseJobsShown: 'Elija entre los trabajos que se muestran.',
      chooseCountry: 'Elija un país.',
      chooseCountryFromList: 'Elija un país de la lista.',
      write: 'Escriba una respuesta.',
      specialCharacters: 'Elimine los caracteres especiales.',
      formulaStart: 'No empiece su respuesta con =, +, - o @.',
      tooLong: 'Use menos de {n} caracteres.',
      sayOther: 'Indique a qué se refiere con “Otro”.'
    },
    fields: {
      chooseOne: 'Elija una opción',
      chooseCountry: 'Elija un país',
      sayMore: 'Cuéntenos más',
      optional: 'Opcional',
      charsRemaining: {
        one: 'Queda {n} carácter',
        many: 'Quedan {n} de caracteres',
        other: 'Quedan {n} caracteres'
      }
    },
    jobs: {
      caption: 'Dos trabajos. Elija el que aceptaría.',
      firstJob: 'Primer trabajo',
      secondJob: 'Segundo trabajo',
      typeOfJob: 'Tipo de trabajo',
      and: ' y ',
      choose: 'Elegir',
      chooseFirst: 'Elegir el primer trabajo',
      chooseSecond: 'Elegir el segundo trabajo',
      vs: 'vs.',
      round: 'Ronda {n} de {total}',
      undo: 'Deshacer la última elección',
      allDone: 'Las {n} rondas están completas',
      again: 'Volver y elegir los trabajos de nuevo'
    },
    prize: {
      heading: 'Gane un libro gratis',
      startBody:
        'Complete la encuesta, luego suscríbase al boletín de Hard Problems y podría ser una de las {copies} personas a las que enviaremos un ejemplar de {title} de {authors}.',
      doneBody:
        'Las personas suscritas al boletín participarán en un sorteo de uno de los {copies} ejemplares de {title} de {authors}.',
      reviewLink: 'Lea nuestra reseña del libro',
      draw: 'Sortearemos al azar {copies} personas suscritas al boletín después de que la encuesta cierre el {date}.',
      thanks:
        'Gracias a Scott and Bryan por regalarnos los libros para repartir.',
      coverAlt: 'Portada de {title} de {authors}',
      termsSummary: 'Bases del sorteo',
      termsNote:
        'Esta es una traducción. Si difiere de la versión en inglés, prevalece la versión en inglés.',
      terms: [
        'El organizador es Hard Problems, una sociedad sin fines de lucro limitada por garantía registrada en Inglaterra y Gales, con número de sociedad 16028166.',
        'No es necesario realizar ninguna compra. La participación es gratuita.',
        'El sorteo está abierto a cualquier persona de 18 años o más, excepto nuestros directores, personal y contratistas, y sus familiares directos. No es válido donde lo prohíba la legislación local.',
        'Para participar, suscríbase al boletín de Hard Problems a más tardar el {date}. Le pedimos que complete primero la encuesta, pero como las respuestas son anónimas no podemos comprobar si lo ha hecho, y no lo comprobamos. Las personas que ya estén suscritas en esa fecha participan automáticamente. Una participación por persona.',
        'Hay {copies} premios. Cada uno es un ejemplar de {title} de {authors}. No hay alternativa en efectivo y los premios no son transferibles.',
        'Las personas ganadoras se seleccionan al azar entre todas las participaciones válidas dentro de los 14 días posteriores a la fecha de cierre, y se les contacta en la dirección de correo electrónico con la que se suscribieron.',
        'Cada persona ganadora tiene 28 días para responder con una dirección postal. Si no lo hace, sorteamos un reemplazo.',
        'Enviamos los premios a todo el mundo por nuestra cuenta. Cualquier arancel de importación o impuesto local corre por cuenta de la persona ganadora.',
        'Usamos el correo electrónico y la dirección postal de la persona ganadora solo para enviar el premio, y eliminamos la dirección postal una vez enviado. Consulte nuestro {link} (en inglés).',
        '{authors} donaron amablemente los libros. El sorteo lo gestiona íntegramente Hard Problems; ni los autores ni su editorial lo administran ni eligen a las personas ganadoras.',
        'Participar implica aceptar estas bases. El sorteo se rige por la legislación de Inglaterra y Gales.'
      ],
      privacyLinkText: 'aviso de privacidad'
    },
    done: {
      title: '¡Gracias!',
      resultsHeading: 'Reciba los resultados en diciembre',
      resultsBody:
        'No le pedimos su correo electrónico, así que sus respuestas siguen siendo anónimas. Para saber cuándo se publique el informe, suscríbase a nuestro {link}.',
      newsletterLinkText: 'boletín',
      shareHeading: 'Ayúdenos a llegar a más personas',
      shareBody:
        'Comparta este enlace en redes sociales. Cuantas más personas respondan esta encuesta, mejor será el informe.',
      shareText:
        'Acabo de responder la encuesta de Hard Problems sobre carreras en diseño y producto. Descubramos qué creemos que hace que una carrera sea satisfactoria. {url} Por favor, compártala.',
      copy: 'Copiar texto',
      copied: 'Copiado',
      shareOr: 'O compártala en',
      shareOn: 'Compartir en {name}',
      emailSubject: 'Una encuesta sobre carreras en diseño y producto'
    },
    newsletter: {
      placeholder: 'Su correo electrónico...',
      emailLabel: 'Su dirección de correo electrónico',
      subscribe: 'Suscribirse',
      subscribing: 'Suscribiendo',
      successTitle: 'Gracias',
      successBody: 'Ya está suscrito/a.',
      errorTitle: 'Algo salió mal',
      errorBody: 'No pudimos suscribirlo/a. Vuelva a intentarlo.',
      networkError:
        'No pudimos conectar con el servicio del boletín. Vuelva a intentarlo.',
      done: 'Listo',
      tryAgain: 'Intentar de nuevo',
      close: 'Cerrar'
    }
  }
};

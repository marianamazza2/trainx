import type { Week, DayData } from '../types/workout'

export const WEEKS: Week[] = [
  { num: 1, label: 'Inicial',    series: 3, reps: 15, restCasa: '1:30 min', restGym: '1 min',      restSecCasa: 90, restSecGym: 60,  iso: '30 seg' },
  { num: 2, label: 'Intermedio', series: 3, reps: 12, restCasa: '1:30 min', restGym: '1:30 min',   restSecCasa: 90, restSecGym: 90,  iso: '40 seg' },
  { num: 3, label: 'Avanzado',   series: 4, reps: 10, restCasa: '40 seg',   restGym: '2-2:30 min', restSecCasa: 40, restSecGym: 135, iso: '60 seg' },
  { num: 4, label: 'Pro',        series: 4, reps: 8,  restCasa: '40 seg',   restGym: '2-3 min',    restSecCasa: 40, restSecGym: 150, iso: '90 seg' },
]

export const TREADMILL: string[][] = [
  ['0:00-4:00',  '3.0', '1.0',  'Calentamiento'],
  ['4:00-5:00',  '3.5', '4.0',  'Moderado'],
  ['5:00-9:00',  '4.0', '10.0', 'Alta'],
  ['9:00-12:00', '3.5', '5.0',  'Moderado'],
  ['12:00-22:00','4.0', '8.0',  'Media-Alta'],
  ['22:00-25:00','3.0', '6.0',  'Moderado'],
  ['26:00-35:00','3.5', '8.0',  'Media-Alta'],
  ['36:00-45:00','4.0', '3.0',  'Moderado'],
  ['45:00-55:00','3.0', '3.0',  'Moderado'],
  ['56:00-60:00','2.5', '0',    'Enfriamiento'],
]

export const CASA_DAYS: DayData[] = [
  {
    name: 'Lunes', muscle: 'Tren Inferior + Tabata', duration: '45-55 min',
    blocks: [
      { type: 'superserie', title: 'SUPERSERIE 1', badge: 'Fuerza', count: 3, exercises: [
        { name: 'Step Up con Mancuerna', muscle: 'Glúteos', repsLabel: '× pierna', perSide: true, video: 'https://vimeo.com/1155210047/562bdb70cb' },
        { name: 'Peso Muerto Rumano', muscle: 'Isquios · Glúteos', video: 'https://vimeo.com/1155159293/756e3f1d99' },
        { name: 'Desplante sin Alternar', muscle: 'Cuádriceps', repsLabel: '× pierna', perSide: true, video: 'https://vimeo.com/551509852/3d193c891a' },
      ]},
      { type: 'tabata', title: 'TABATA #1', badge: 'Cardio', timing: '30s trabajo → 10s descanso', workSec: 30, restSec: 10, rounds: 4, exercises: [
        { name: 'Squat with Calf Raise', muscle: 'Piernas', timeLabel: '30 seg', video: 'https://vimeo.com/435247917/0e061eff2d' },
        { name: 'Butt Kicks', muscle: 'Cardio', timeLabel: '30 seg', video: 'https://vimeo.com/431991725/df5b615666' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE 2', badge: 'Fuerza', count: 4, exercises: [
        { name: 'Desplante Caminando', muscle: 'Cuádriceps', repsLabel: '× pierna', perSide: true, video: 'https://vimeo.com/420923811/43ec3cfb1f' },
        { name: 'Peso Muerto', muscle: 'Isquios · Espalda', video: 'https://vimeo.com/431984385/ff9378090f' },
        { name: 'High Knees', muscle: 'Cardio', repsLabel: '× pierna', perSide: true, video: 'https://vimeo.com/1155209154/d16bd6f55f' },
        { name: 'Lateral Fire Hydrant', muscle: 'Glúteo medio', repsLabel: '× lado', perSide: true, video: 'https://vimeo.com/420928613/ceed97f2cc' },
      ]},
      { type: 'tabata', title: 'TABATA #2', badge: 'Cardio', timing: '40s trabajo → 10s descanso', workSec: 40, restSec: 10, rounds: 4, exercises: [
        { name: 'Curtsy Lunge con Mancuernas', muscle: 'Glúteos', timeLabel: '40 seg', video: 'https://vimeo.com/1155208935/c561642da0' },
        { name: 'Sentadilla Sumo Pulsaciones', muscle: 'Aductores', timeLabel: '40 seg', video: 'https://vimeo.com/1155209839/ab0e433c59' },
      ]},
    ],
  },
  {
    name: 'Martes', muscle: 'Cardio HIIT + Abdomen', duration: '40-50 min',
    blocks: [
      { type: 'hiit', title: 'HIIT & ABDOMEN', badge: 'Circuito', timing: '40s trabajo · 40-90s descanso', workSec: 40, restSec: 10, rounds: 4, exercises: [
        { name: 'Scissors', muscle: 'Abdomen bajo', timeLabel: '40 seg', video: 'https://vimeo.com/435247986/6367844610' },
        { name: 'Squat with Calf Raise', muscle: 'Piernas', timeLabel: '40 seg', video: 'https://vimeo.com/435247917/0e061eff2d' },
        { name: 'Desplante sin Alternar', muscle: 'Cuádriceps', timeLabel: '40 seg', video: 'https://vimeo.com/551509852/3d193c891a' },
        { name: 'High Knees', muscle: 'Cardio', timeLabel: '40 seg', video: 'https://vimeo.com/1155209154/d16bd6f55f' },
        { name: 'Russian Twists', muscle: 'Oblicuos', timeLabel: '40 seg', video: 'https://vimeo.com/551518639/d29ccd39ea' },
        { name: 'Desplantes Laterales', muscle: 'Piernas', timeLabel: '40 seg' },
        { name: 'Encogimiento de Rodillas', muscle: 'Abdomen', timeLabel: '40 seg', video: 'https://vimeo.com/446988037/bfa64066f3' },
        { name: 'Plancha', muscle: 'Core', timeLabel: '40 seg', isIso: true },
      ]},
    ],
  },
  {
    name: 'Miércoles', muscle: 'Tren Superior + Tabata', duration: '45-55 min',
    blocks: [
      { type: 'superserie', title: 'SUPERSERIE 1', badge: 'Fuerza', count: 3, exercises: [
        { name: 'Curl Martillo + Clean Press', muscle: 'Bíceps · Hombros', video: 'https://vimeo.com/431983531/05544e65b1' },
        { name: 'Press Mancuernas Banco Plano', muscle: 'Pecho', video: 'https://vimeo.com/784382400/a785bdf80d' },
        { name: 'Remo Alternado con Mancuerna', muscle: 'Espalda' },
      ]},
      { type: 'tabata', title: 'TABATA #1', badge: 'Cardio', timing: '40s trabajo → 10s descanso', workSec: 40, restSec: 10, rounds: 4, exercises: [
        { name: 'High Knees', muscle: 'Cardio', timeLabel: '40 seg', video: 'https://vimeo.com/1155209154/d16bd6f55f' },
        { name: 'Thrusters / Press de Hombro', muscle: 'Full Body', timeLabel: '40 seg' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE 2', badge: 'Fuerza', count: 4, exercises: [
        { name: 'Elevación Lateral Isolateral', muscle: 'Hombros', isIso: true },
        { name: 'Copa a Dos Manos', muscle: 'Tríceps' },
        { name: 'Eccentric Push Up', muscle: 'Pecho · Tríceps', video: 'https://vimeo.com/784382400/a785bdf80d' },
        { name: 'Curl Martillo', muscle: 'Bíceps', video: 'https://vimeo.com/431983531/05544e65b1' },
      ]},
      { type: 'tabata', title: 'TABATA #2', badge: 'Cardio', timing: '40s trabajo → 10s descanso', workSec: 40, restSec: 10, rounds: 4, exercises: [
        { name: 'Back Pull Apart', muscle: 'Espalda', timeLabel: '40 seg' },
        { name: 'Thrusters con Mancuerna', muscle: 'Full Body', timeLabel: '40 seg' },
      ]},
    ],
  },
  {
    name: 'Jueves', muscle: 'Cardio HIT + Abdomen', duration: '40-50 min',
    blocks: [
      { type: 'hiit', title: 'HIT & ABDOMEN', badge: 'Circuito', timing: '40s trabajo · 40-90s descanso', workSec: 40, restSec: 10, rounds: 4, exercises: [
        { name: 'Scissors', muscle: 'Abdomen bajo', timeLabel: '40 seg', video: 'https://vimeo.com/435247986/6367844610' },
        { name: 'Hollow Hold', muscle: 'Abdomen', timeLabel: '40 seg', isIso: true, video: 'https://vimeo.com/439140613/aa6a1b2de7' },
        { name: 'Russian Twist', muscle: 'Oblicuos', timeLabel: '40 seg', video: 'https://vimeo.com/551518639/d29ccd39ea' },
        { name: 'Plancha', muscle: 'Core', timeLabel: '40 seg', isIso: true },
        { name: 'High Knees', muscle: 'Cardio', timeLabel: '40 seg', video: 'https://vimeo.com/1155209154/d16bd6f55f' },
        { name: 'Renegade Row', muscle: 'Espalda · Core', timeLabel: '40 seg' },
        { name: 'Encogimiento Torso y Rodillas', muscle: 'Abdomen', timeLabel: '40 seg', video: 'https://vimeo.com/446988037/bfa64066f3' },
        { name: 'Curtsy Lunge con Mancuernas', muscle: 'Glúteos', timeLabel: '40 seg', video: 'https://vimeo.com/1155208935/c561642da0' },
      ]},
    ],
  },
  {
    name: 'Viernes', muscle: 'Full Body', duration: '50-60 min',
    blocks: [
      { type: 'superserie', title: 'SUPERSERIE 1', badge: 'Full Body', count: 4, exercises: [
        { name: 'Sentadilla Sumo Pulsaciones', muscle: 'Aductores', video: 'https://vimeo.com/1155209839/ab0e433c59' },
        { name: 'Press de Pecho con Mancuernas', muscle: 'Pecho' },
        { name: 'Desplantes Fijos con Mancuernas', muscle: 'Piernas', video: 'https://vimeo.com/439140965/912c792a67' },
        { name: 'Back Pull Apart', muscle: 'Espalda' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE 2', badge: 'Full Body', count: 4, exercises: [
        { name: 'Renegade Row', muscle: 'Espalda · Core' },
        { name: 'Peso Muerto Rumano Una Pierna', muscle: 'Isquios', video: 'https://vimeo.com/1155159293/756e3f1d99' },
        { name: 'Remo Unilateral', muscle: 'Espalda' },
        { name: 'Peso Muerto', muscle: 'Isquios · Espalda', video: 'https://vimeo.com/431984385/ff9378090f' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE 3', badge: 'Full Body', count: 4, exercises: [
        { name: 'Curl Martillo', muscle: 'Bíceps', video: 'https://vimeo.com/431983531/05544e65b1' },
        { name: 'Squat with Calf Raise', muscle: 'Piernas', video: 'https://vimeo.com/435247917/0e061eff2d' },
        { name: 'Eccentric Push Up', muscle: 'Pecho · Tríceps', video: 'https://vimeo.com/784382400/a785bdf80d' },
        { name: 'Desplantes Fijos con Mancuernas', muscle: 'Piernas', video: 'https://vimeo.com/439140965/912c792a67' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE 4', badge: 'Core', count: 4, exercises: [
        { name: 'Hollow Hold', muscle: 'Abdomen', isIso: true, video: 'https://vimeo.com/439140613/aa6a1b2de7' },
        { name: 'Encogimiento Torso y Rodillas', muscle: 'Abdomen', video: 'https://vimeo.com/446988037/bfa64066f3' },
        { name: 'Russian Twist', muscle: 'Oblicuos', video: 'https://vimeo.com/551518639/d29ccd39ea' },
        { name: 'Scissors', muscle: 'Abdomen bajo', video: 'https://vimeo.com/435247986/6367844610' },
      ]},
    ],
  },
  {
    name: 'Sábado', muscle: 'Cardio LISS', duration: '60 min',
    isCasaCardio: true,
    blocks: [],
  },
]

export const GYM_DAYS: DayData[] = [
  {
    name: 'Lunes', muscle: 'Tren Inferior', duration: '60-75 min',
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Cuádriceps', exercises: [
        { name: 'Sentadilla Hack', muscle: 'Cuádriceps' },
        { name: 'Desplante sin Alternar con Mancuernas', muscle: 'Cuádriceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Isquios', exercises: [
        { name: 'Peso Muerto con Mancuernas', muscle: 'Isquios' },
        { name: 'Curl Femoral Acostado', muscle: 'Isquios' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Glúteos', exercises: [
        { name: 'Good Mornings', muscle: 'Isquios · Glúteos' },
        { name: 'Abductor en Máquina', muscle: 'Glúteo medio' },
      ]},
      { type: 'biserie', title: 'BISERIE 4', badge: 'Piernas', exercises: [
        { name: 'Extensión de Cuádricep en Máquina', muscle: 'Cuádriceps' },
        { name: 'Standing Dumbbell Calf Raise', muscle: 'Pantorrillas' },
      ]},
      { type: 'serie', title: 'SERIE FINAL', badge: 'Glúteos', exercises: [
        { name: 'Hip Thrust', muscle: 'Glúteos' },
      ]},
    ],
  },
  {
    name: 'Martes', muscle: 'Tren Superior / Abdomen', duration: '60-75 min',
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Pecho', exercises: [
        { name: 'Press Pecho Inclinado con Mancuernas', muscle: 'Pecho sup.' },
        { name: 'Pec Fly con Poleas', muscle: 'Pecho' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Pecho · Espalda', exercises: [
        { name: 'Eccentric Push Up', muscle: 'Pecho · Tríceps' },
        { name: 'Pullover en Polea', muscle: 'Espalda · Pecho' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Hombros', exercises: [
        { name: 'Press Frontal con Mancuernas', muscle: 'Hombro anterior' },
        { name: 'Flys Invertidos con Mancuerna', muscle: 'Hombro posterior' },
      ]},
      { type: 'biserie', title: 'BISERIE 4', badge: 'Hombros', exercises: [
        { name: 'Elevación Frontal de Mancuernas', muscle: 'Deltoides' },
        { name: 'Elevación Lateral', muscle: 'Deltoides', isIso: true },
      ]},
      { type: 'biserie', title: 'BISERIE 5', badge: 'Tríceps', exercises: [
        { name: 'Copa a Dos Manos con Mancuerna', muscle: 'Tríceps' },
        { name: 'Extensión de Tríceps con Barra', muscle: 'Tríceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 6', badge: 'Bíceps', exercises: [
        { name: 'Curl Bíceps Martillo Simultáneo', muscle: 'Bíceps' },
        { name: 'Curl Predicador Dos Manos (Máquina)', muscle: 'Bíceps' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE ABDOMEN', badge: 'Core', count: 4, exercises: [
        { name: 'Crunch en Máquina', muscle: 'Abdomen' },
        { name: 'Encogimiento Torso y Rodillas Banco', muscle: 'Abdomen' },
        { name: 'Russian Twists', muscle: 'Oblicuos' },
        { name: 'Crunch Lateral Cuerda en Polea', muscle: 'Oblicuos' },
      ]},
    ],
  },
  {
    name: 'Miércoles', muscle: 'Tren Inferior', duration: '60-75 min',
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Isquios', exercises: [
        { name: 'Good Mornings', muscle: 'Isquios · Glúteos' },
        { name: 'Curl Femoral Sentado', muscle: 'Isquios' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Cuádriceps', exercises: [
        { name: 'Desplantes en Smith', muscle: 'Cuádriceps · Glúteos' },
        { name: 'Sentadilla Hack', muscle: 'Cuádriceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Posterior', exercises: [
        { name: 'Peso Muerto con Mancuernas', muscle: 'Isquios · Espalda' },
        { name: 'Standing Dumbbell Calf Raise', muscle: 'Pantorrillas' },
      ]},
      { type: 'biserie', title: 'BISERIE 4', badge: 'Glúteos', exercises: [
        { name: 'Hip Thrust (Máquina Smith)', muscle: 'Glúteos' },
        { name: 'Abductor en Máquina', muscle: 'Glúteo medio' },
      ]},
    ],
  },
  {
    name: 'Jueves', muscle: 'Tren Superior / Abdomen', duration: '60-75 min',
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Hombros', exercises: [
        { name: 'Press Frontal con Barra', muscle: 'Hombro anterior' },
        { name: 'Elevaciones Laterales + Frontales', muscle: 'Deltoides' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Espalda', exercises: [
        { name: 'Remo Unilateral', muscle: 'Espalda' },
        { name: 'Remo Sentado con Barra', muscle: 'Espalda media' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Pecho · Espalda', exercises: [
        { name: 'Flys Invertidos con Mancuerna', muscle: 'Hombro posterior' },
        { name: 'Pec Fly con Poleas', muscle: 'Pecho' },
      ]},
      { type: 'biserie', title: 'BISERIE 4', badge: 'Tríceps', exercises: [
        { name: 'Extensión Trícep Cuerda en Polea', muscle: 'Tríceps' },
        { name: 'Copa a Una Mano con Mancuerna', muscle: 'Tríceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 5', badge: 'Bíceps', exercises: [
        { name: 'Spider Curl con Mancuernas', muscle: 'Bíceps' },
        { name: 'Curl Bíceps Martillo Simultáneo', muscle: 'Bíceps' },
      ]},
      { type: 'superserie', title: 'SUPERSERIE ABDOMEN', badge: 'Core', count: 4, exercises: [
        { name: 'Crunch Cuerda Hincado en Piso', muscle: 'Abdomen' },
        { name: 'Rollout', muscle: 'Core' },
        { name: 'Crunch Lateral con Cuerda', muscle: 'Oblicuos' },
        { name: 'Russian Twists', muscle: 'Oblicuos' },
      ]},
    ],
  },
  {
    name: 'Viernes', muscle: 'Full Body', duration: '60-75 min',
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Piernas', exercises: [
        { name: 'Prensa Pies Juntos Profunda', muscle: 'Cuádriceps' },
        { name: 'Sentadilla Hack', muscle: 'Cuádriceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Pecho', exercises: [
        { name: 'Pec Fly', muscle: 'Pecho' },
        { name: 'Eccentric Push Up', muscle: 'Pecho · Tríceps' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Posterior', exercises: [
        { name: 'Peso Muerto con Mancuernas', muscle: 'Isquios · Espalda' },
        { name: 'Desplantes Caminando con Barra', muscle: 'Cuádriceps · Glúteos' },
      ]},
      { type: 'biserie', title: 'BISERIE 4', badge: 'Brazos', exercises: [
        { name: 'Curl Martillo + Clean Press', muscle: 'Bíceps · Hombros' },
        { name: 'Flys Invertidos con Mancuerna', muscle: 'Hombro posterior' },
      ]},
      { type: 'biserie', title: 'BISERIE 5', badge: 'Glúteos', exercises: [
        { name: 'Hip Thrust (Barra o Smith)', muscle: 'Glúteos' },
        { name: 'Abductor en Máquina', muscle: 'Glúteo medio' },
      ]},
    ],
  },
  {
    name: 'Sábado', muscle: 'Abdomen + Cardio LISS', duration: '90 min',
    isGymCardio: true,
    blocks: [
      { type: 'biserie', title: 'BISERIE 1', badge: 'Abdomen', exercises: [
        { name: 'Elevación de Piernas Colgado', muscle: 'Abdomen bajo' },
        { name: 'Scissors', muscle: 'Abdomen bajo' },
      ]},
      { type: 'biserie', title: 'BISERIE 2', badge: 'Abdomen', exercises: [
        { name: 'Crunch con Cuerda', muscle: 'Abdomen' },
        { name: 'Encogimiento Lateral Polea Cuerda', muscle: 'Oblicuos' },
      ]},
      { type: 'biserie', title: 'BISERIE 3', badge: 'Core', exercises: [
        { name: 'Russian Twists', muscle: 'Oblicuos' },
        { name: 'Plancha', muscle: 'Core', isIso: true },
      ]},
    ],
  },
]

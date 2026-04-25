import type { Topic, Word, WordStatus } from "./types";

type WordSeed = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example?: string;
  status?: WordStatus;
  nextReview?: string;
  correctCount?: number;
  wrongCount?: number;
};

function createWord(seed: WordSeed): Word {
  return {
    id: seed.id,
    hanzi: seed.hanzi,
    pinyin: seed.pinyin,
    meaning: seed.meaning,
    example: seed.example,
    status: seed.status ?? "new",
    nextReview: seed.nextReview ? new Date(seed.nextReview) : undefined,
    correctCount: seed.correctCount ?? 0,
    wrongCount: seed.wrongCount ?? 0,
  };
}

function createTopic(topic: Topic): Topic {
  return {
    ...topic,
    lessons: topic.lessons.map((lesson) => ({
      ...lesson,
      words: lesson.words.map((word) => ({ ...word })),
    })),
  };
}

export const vocabularyTopicsByLanguage: Record<string, Topic[]> = {
  zh: [
    createTopic({
      id: "zh-giao-tiep",
      label: "GIAO TIEP",
      title: "Nền tảng giao tiếp",
      description: "Từ vựng mở đầu để chào hỏi, giới thiệu và phản hồi tự nhiên trong hội thoại cơ bản.",
      lessons: [
        {
          id: "zh-lesson-hello-basics",
          title: "Bài 1 - Chào hỏi cơ bản",
          words: [
            createWord({ id: "zh-ni-hao", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "Xin chao", example: "你好！很高兴认识你。", status: "learning", correctCount: 3, wrongCount: 1, nextReview: "2026-04-26T08:00:00.000Z" }),
            createWord({ id: "zh-zao-shang-hao", hanzi: "早上好", pinyin: "zǎo shang hǎo", meaning: "Chao buoi sang", example: "老师，早上好！" }),
            createWord({ id: "zh-wan-shang-hao", hanzi: "晚上好", pinyin: "wǎn shang hǎo", meaning: "Chao buoi toi", example: "大家晚上好。" }),
            createWord({ id: "zh-zai-jian", hanzi: "再见", pinyin: "zài jiàn", meaning: "Tam biet", example: "明天见，再见！", status: "learning", correctCount: 2, wrongCount: 1, nextReview: "2026-04-26T14:00:00.000Z" }),
            createWord({ id: "zh-xie-xie", hanzi: "谢谢", pinyin: "xiè xie", meaning: "Cam on", example: "谢谢你的帮助。", status: "mastered", correctCount: 6, wrongCount: 0, nextReview: "2026-04-28T09:30:00.000Z" }),
            createWord({ id: "zh-bu-ke-qi", hanzi: "不客气", pinyin: "bú kè qi", meaning: "Không có gì", example: "A：谢谢！B：不客气。", status: "learning", correctCount: 2, wrongCount: 2, nextReview: "2026-04-27T10:15:00.000Z" }),
          ],
        },
        {
          id: "zh-lesson-intro-basics",
          title: "Bài 2 - Giới thiệu bản thân",
          words: [
            createWord({ id: "zh-wo-jiao", hanzi: "我叫", pinyin: "wǒ jiào", meaning: "Tôi tên là", example: "我叫明。", status: "learning", correctCount: 4, wrongCount: 1, nextReview: "2026-04-26T11:00:00.000Z" }),
            createWord({ id: "zh-wo-shi", hanzi: "我是", pinyin: "wǒ shì", meaning: "Tôi là", example: "我是学生。", status: "learning", correctCount: 3, wrongCount: 1, nextReview: "2026-04-26T15:30:00.000Z" }),
            createWord({ id: "zh-xue-sheng", hanzi: "学生", pinyin: "xué sheng", meaning: "Hoc sinh / sinh vien", example: "她是大学生。" }),
            createWord({ id: "zh-lao-shi", hanzi: "老师", pinyin: "lǎo shī", meaning: "Giao vien", example: "王老师很好。" }),
            createWord({ id: "zh-wo-lai-zi", hanzi: "我来自", pinyin: "wǒ lái zì", meaning: "Tôi đến từ", example: "我来自越南。", status: "learning", correctCount: 1, wrongCount: 2, nextReview: "2026-04-27T07:00:00.000Z" }),
            createWord({ id: "zh-ren-shi-ni", hanzi: "认识你", pinyin: "rèn shi nǐ", meaning: "Lam quen voi ban", example: "很高兴认识你。", status: "mastered", correctCount: 5, wrongCount: 0, nextReview: "2026-04-29T13:00:00.000Z" }),
          ],
        },
      ],
    }),
  ],
  en: [
    createTopic({
      id: "en-basic-communication",
      label: "COMMUNICATION",
      title: "Everyday conversation basics",
      description: "Starter vocabulary for greetings, self-introduction, and common polite responses in English.",
      lessons: [
        {
          id: "en-lesson-greetings",
          title: "Lesson 1 - Basic greetings",
          words: [
            createWord({ id: "en-hello", hanzi: "Hello", pinyin: "/həˈloʊ/", meaning: "Xin chao", example: "Hello, nice to meet you.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "en-good-morning", hanzi: "Good morning", pinyin: "/ɡʊd ˈmɔːrnɪŋ/", meaning: "Chao buoi sang", example: "Good morning, teacher!" }),
            createWord({ id: "en-good-evening", hanzi: "Good evening", pinyin: "/ɡʊd ˈiːvnɪŋ/", meaning: "Chao buoi toi", example: "Good evening, everyone." }),
            createWord({ id: "en-goodbye", hanzi: "Goodbye", pinyin: "/ɡʊdˈbaɪ/", meaning: "Tam biet", example: "See you tomorrow, goodbye!", status: "learning", correctCount: 2, wrongCount: 1 }),
            createWord({ id: "en-thank-you", hanzi: "Thank you", pinyin: "/ˈθæŋk juː/", meaning: "Cam on", example: "Thank you for your help.", status: "mastered", correctCount: 6, wrongCount: 0 }),
            createWord({ id: "en-youre-welcome", hanzi: "You're welcome", pinyin: "/jʊr ˈwelkəm/", meaning: "Không có gì", example: "A: Thank you! B: You're welcome.", status: "learning", correctCount: 2, wrongCount: 2 }),
          ],
        },
        {
          id: "en-lesson-introduction",
          title: "Lesson 2 - Self introduction",
          words: [
            createWord({ id: "en-my-name-is", hanzi: "My name is", pinyin: "/maɪ neɪm ɪz/", meaning: "Tôi tên là", example: "My name is Minh.", status: "learning", correctCount: 4, wrongCount: 1 }),
            createWord({ id: "en-i-am", hanzi: "I am", pinyin: "/aɪ æm/", meaning: "Tôi là", example: "I am a student.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "en-student", hanzi: "Student", pinyin: "/ˈstuːdnt/", meaning: "Hoc sinh / sinh vien", example: "She is a university student." }),
            createWord({ id: "en-teacher", hanzi: "Teacher", pinyin: "/ˈtiːtʃər/", meaning: "Giao vien", example: "Our teacher is very kind." }),
            createWord({ id: "en-i-am-from", hanzi: "I am from", pinyin: "/aɪ æm frəm/", meaning: "Tôi đến từ", example: "I am from Vietnam.", status: "learning", correctCount: 1, wrongCount: 2 }),
            createWord({ id: "en-nice-to-meet-you", hanzi: "Nice to meet you", pinyin: "/naɪs tə miːt juː/", meaning: "Rat vui duoc gap ban", example: "Nice to meet you, too.", status: "mastered", correctCount: 5, wrongCount: 0 }),
          ],
        },
      ],
    }),
  ],
  ja: [
    createTopic({
      id: "ja-basic-communication",
      label: "KAIWA",
      title: "Foundation conversation",
      description: "Core Japanese words for greetings, introducing yourself, and speaking politely in daily situations.",
      lessons: [
        {
          id: "ja-lesson-greetings",
          title: "Lesson 1 - Basic greetings",
          words: [
            createWord({ id: "ja-konnichiwa", hanzi: "こんにちは", pinyin: "konnichiwa", meaning: "Xin chao", example: "こんにちは、はじめまして。", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "ja-ohayou", hanzi: "おはよう", pinyin: "ohayou", meaning: "Chao buoi sang", example: "先生、おはようございます。" }),
            createWord({ id: "ja-konbanwa", hanzi: "こんばんは", pinyin: "konbanwa", meaning: "Chao buoi toi", example: "みなさん、こんばんは。" }),
            createWord({ id: "ja-sayonara", hanzi: "さようなら", pinyin: "sayonara", meaning: "Tam biet", example: "また明日、さようなら。", status: "learning", correctCount: 2, wrongCount: 1 }),
            createWord({ id: "ja-arigatou", hanzi: "ありがとう", pinyin: "arigatou", meaning: "Cam on", example: "手伝ってくれてありがとう。", status: "mastered", correctCount: 6, wrongCount: 0 }),
            createWord({ id: "ja-do-itashimashite", hanzi: "どういたしまして", pinyin: "dou itashimashite", meaning: "Không có gì", example: "A: ありがとう。B: どういたしまして。", status: "learning", correctCount: 2, wrongCount: 2 }),
          ],
        },
        {
          id: "ja-lesson-introduction",
          title: "Lesson 2 - Self introduction",
          words: [
            createWord({ id: "ja-watashi-wa", hanzi: "私は", pinyin: "watashi wa", meaning: "Tôi là", example: "私はミンです。", status: "learning", correctCount: 4, wrongCount: 1 }),
            createWord({ id: "ja-namae-wa", hanzi: "名前は", pinyin: "namae wa", meaning: "Ten toi la", example: "名前はリンです。", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "ja-gakusei", hanzi: "学生", pinyin: "gakusei", meaning: "Hoc sinh / sinh vien", example: "彼女は大学生です。" }),
            createWord({ id: "ja-sensei", hanzi: "先生", pinyin: "sensei", meaning: "Giao vien", example: "田中先生はやさしいです。" }),
            createWord({ id: "ja-shusshin", hanzi: "出身", pinyin: "shusshin", meaning: "Den tu", example: "ベトナム出身です。", status: "learning", correctCount: 1, wrongCount: 2 }),
            createWord({ id: "ja-yoroshiku", hanzi: "よろしくお願いします", pinyin: "yoroshiku onegaishimasu", meaning: "Rat mong duoc giup do / lam quen", example: "はじめまして。よろしくお願いします。", status: "mastered", correctCount: 5, wrongCount: 0 }),
          ],
        },
      ],
    }),
  ],
  ko: [
    createTopic({
      id: "ko-basic-communication",
      label: "DAILY TALK",
      title: "Basic communication",
      description: "Starter Korean vocabulary for greetings, polite conversation, and introducing yourself naturally.",
      lessons: [
        {
          id: "ko-lesson-greetings",
          title: "Lesson 1 - Basic greetings",
          words: [
            createWord({ id: "ko-annyeonghaseyo", hanzi: "안녕하세요", pinyin: "annyeonghaseyo", meaning: "Xin chao", example: "안녕하세요? 만나서 반가워요.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "ko-good-morning", hanzi: "좋은 아침이에요", pinyin: "joeun achimieyo", meaning: "Chao buoi sang", example: "선생님, 좋은 아침이에요!" }),
            createWord({ id: "ko-good-evening", hanzi: "좋은 저녁이에요", pinyin: "joeun jeonyeogieyo", meaning: "Chao buoi toi", example: "여러분, 좋은 저녁이에요." }),
            createWord({ id: "ko-annyeong", hanzi: "안녕히 가세요", pinyin: "annyeonghi gaseyo", meaning: "Tam biet", example: "내일 봐요. 안녕히 가세요.", status: "learning", correctCount: 2, wrongCount: 1 }),
            createWord({ id: "ko-gamsahamnida", hanzi: "감사합니다", pinyin: "gamsahamnida", meaning: "Cam on", example: "도와주셔서 감사합니다.", status: "mastered", correctCount: 6, wrongCount: 0 }),
            createWord({ id: "ko-cheonmaneyo", hanzi: "천만에요", pinyin: "cheonmaneyo", meaning: "Không có gì", example: "A: 감사합니다. B: 천만에요.", status: "learning", correctCount: 2, wrongCount: 2 }),
          ],
        },
        {
          id: "ko-lesson-introduction",
          title: "Lesson 2 - Self introduction",
          words: [
            createWord({ id: "ko-jeoneun", hanzi: "저는", pinyin: "jeoneun", meaning: "Tôi là", example: "저는 민이라고 해요.", status: "learning", correctCount: 4, wrongCount: 1 }),
            createWord({ id: "ko-ireumeun", hanzi: "이름은", pinyin: "ireumeun", meaning: "Ten toi la", example: "제 이름은 린이에요.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "ko-haksaeng", hanzi: "학생", pinyin: "haksaeng", meaning: "Hoc sinh / sinh vien", example: "그녀는 대학생이에요." }),
            createWord({ id: "ko-seonsaengnim", hanzi: "선생님", pinyin: "seonsaengnim", meaning: "Giao vien", example: "우리 선생님은 친절해요." }),
            createWord({ id: "ko-wasseoyo", hanzi: "왔어요", pinyin: "wasseoyo", meaning: "Đến từ / đã đến", example: "저는 베트남에서 왔어요.", status: "learning", correctCount: 1, wrongCount: 2 }),
            createWord({ id: "ko-jal-butak", hanzi: "잘 부탁드립니다", pinyin: "jal butakdeurimnida", meaning: "Rat mong duoc giup do / lam quen", example: "처음 뵙겠습니다. 잘 부탁드립니다.", status: "mastered", correctCount: 5, wrongCount: 0 }),
          ],
        },
      ],
    }),
  ],
  de: [
    createTopic({
      id: "de-basic-communication",
      label: "KOMMUNIKATION",
      title: "Grundlagen fur Gesprache",
      description: "Basiswortschatz fur Begrussung, Vorstellung und hofliche Antworten im Alltag.",
      lessons: [
        {
          id: "de-lesson-greetings",
          title: "Lektion 1 - Grundbegrussungen",
          words: [
            createWord({ id: "de-hallo", hanzi: "Hallo", pinyin: "/ˈhaloː/", meaning: "Xin chao", example: "Hallo, schön dich kennenzulernen.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "de-guten-morgen", hanzi: "Guten Morgen", pinyin: "/ˈɡuːtn̩ ˈmɔʁɡn̩/", meaning: "Chao buoi sang", example: "Guten Morgen, Lehrer!" }),
            createWord({ id: "de-guten-abend", hanzi: "Guten Abend", pinyin: "/ˈɡuːtn̩ ˈaːbn̩t/", meaning: "Chao buoi toi", example: "Guten Abend zusammen." }),
            createWord({ id: "de-auf-wiedersehen", hanzi: "Auf Wiedersehen", pinyin: "/aʊf ˈviːdɐˌzeːən/", meaning: "Tam biet", example: "Bis morgen, auf Wiedersehen!", status: "learning", correctCount: 2, wrongCount: 1 }),
            createWord({ id: "de-danke", hanzi: "Danke", pinyin: "/ˈdaŋkə/", meaning: "Cam on", example: "Danke fur deine Hilfe.", status: "mastered", correctCount: 6, wrongCount: 0 }),
            createWord({ id: "de-bitte", hanzi: "Bitte", pinyin: "/ˈbɪtə/", meaning: "Không có gì", example: "A: Danke! B: Bitte.", status: "learning", correctCount: 2, wrongCount: 2 }),
          ],
        },
        {
          id: "de-lesson-introduction",
          title: "Lektion 2 - Sich vorstellen",
          words: [
            createWord({ id: "de-ich-heisse", hanzi: "Ich heiße", pinyin: "/ɪç ˈhaɪsə/", meaning: "Tôi tên là", example: "Ich heiße Minh.", status: "learning", correctCount: 4, wrongCount: 1 }),
            createWord({ id: "de-ich-bin", hanzi: "Ich bin", pinyin: "/ɪç bɪn/", meaning: "Tôi là", example: "Ich bin Student.", status: "learning", correctCount: 3, wrongCount: 1 }),
            createWord({ id: "de-der-student", hanzi: "Student", pinyin: "/ʃtuˈdɛnt/", meaning: "Hoc sinh / sinh vien", example: "Sie ist Studentin." }),
            createWord({ id: "de-der-lehrer", hanzi: "Lehrer", pinyin: "/ˈleːʁɐ/", meaning: "Giao vien", example: "Unser Lehrer ist freundlich." }),
            createWord({ id: "de-ich-komme-aus", hanzi: "Ich komme aus", pinyin: "/ɪç ˈkɔmə aʊs/", meaning: "Tôi đến từ", example: "Ich komme aus Vietnam.", status: "learning", correctCount: 1, wrongCount: 2 }),
            createWord({ id: "de-freut-mich", hanzi: "Freut mich", pinyin: "/fʁɔʏt mɪç/", meaning: "Rat vui duoc gap ban", example: "Freut mich, dich kennenzulernen.", status: "mastered", correctCount: 5, wrongCount: 0 }),
          ],
        },
      ],
    }),
  ],
};

export const vocabularyTopics = vocabularyTopicsByLanguage.zh;

export function getVocabularyTopicsByLanguage(languageCode: string | undefined): Topic[] {
  if (!languageCode || !(languageCode in vocabularyTopicsByLanguage)) {
    return vocabularyTopicsByLanguage.zh;
  }

  return vocabularyTopicsByLanguage[languageCode];
}

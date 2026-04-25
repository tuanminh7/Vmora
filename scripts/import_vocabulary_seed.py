from __future__ import annotations

import asyncio
import argparse
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, select

from app.db.session import AsyncSessionLocal, init_db
from app.models.language import Language
from app.models.vocabulary import VocabularyEntry


SEED_FILE = ROOT_DIR / "data" / "normalized" / "vocabulary_seed.json"
CURATED_SEED_FILE = ROOT_DIR / "data" / "seed" / "vocabulary_en_zh.json"


LANGUAGE_MAP = {
    "en": "Tiếng Anh",
    "ja": "Tiếng Nhật",
    "ko": "Tiếng Hàn",
    "zh": "Tiếng Trung",
    "de": "Tiếng Đức",
}


def curated_zh_entry(
    word: str,
    reading: str,
    part_of_speech: str,
    meaning_en: str,
    meaning_vi: str,
    example: str,
    example_meaning_vi: str,
) -> dict:
    return {
        "language_code": "zh",
        "language_name": "Chinese",
        "word": word,
        "reading": reading,
        "part_of_speech": part_of_speech,
        "meaning_en": meaning_en,
        "meaning_vi": meaning_vi,
        "example": example,
        "example_meaning_vi": example_meaning_vi,
        "source_name": "Vmora curated zh",
        "source_url": "local://vmora/zh/curated",
    }


CURATED_LANGUAGE_PAYLOADS = {
    "zh": [
        curated_zh_entry("你好", "ni3 hao3", "phrase", "hello", "xin chao", "你好，我叫明。", "Xin chao, toi ten la Minh."),
        curated_zh_entry("谢谢", "xie4 xie5", "phrase", "thank you", "cam on", "谢谢你的帮助。", "Cam on su giup do cua ban."),
        curated_zh_entry("请", "qing3", "verb", "please; to invite", "xin moi; vui long", "请坐。", "Xin moi ngoi."),
        curated_zh_entry("对不起", "dui4 bu qi3", "phrase", "sorry", "xin loi", "对不起，我来晚了。", "Xin loi, toi den muon."),
        curated_zh_entry("没关系", "mei2 guan1 xi5", "phrase", "it's okay", "khong sao", "没关系，我们可以再试一次。", "Khong sao, chung ta co the thu lai."),
        curated_zh_entry("再见", "zai4 jian4", "phrase", "goodbye", "tam biet", "明天见，再见。", "Hen gap ngay mai, tam biet."),
        curated_zh_entry("我", "wo3", "pronoun", "I; me", "toi", "我是学生。", "Toi la hoc sinh."),
        curated_zh_entry("你", "ni3", "pronoun", "you", "ban", "你今天忙吗？", "Hom nay ban co ban khong?"),
        curated_zh_entry("他", "ta1", "pronoun", "he; him", "anh ay", "他是我的朋友。", "Anh ay la ban cua toi."),
        curated_zh_entry("她", "ta1", "pronoun", "she; her", "co ay", "她是老师。", "Co ay la giao vien."),
        curated_zh_entry("我们", "wo3 men5", "pronoun", "we; us", "chung toi", "我们一起学习中文。", "Chung toi hoc tieng Trung cung nhau."),
        curated_zh_entry("他们", "ta1 men5", "pronoun", "they; them", "ho", "他们在教室里。", "Ho dang o trong lop."),
        curated_zh_entry("名字", "ming2 zi5", "noun", "name", "ten", "你的名字是什么？", "Ten cua ban la gi?"),
        curated_zh_entry("朋友", "peng2 you5", "noun", "friend", "ban be", "他是我的朋友。", "Anh ay la ban cua toi."),
        curated_zh_entry("老师", "lao3 shi1", "noun", "teacher", "giao vien", "王老师很好。", "Co Vuong rat tot."),
        curated_zh_entry("学生", "xue2 sheng5", "noun", "student", "hoc sinh", "我是大学生。", "Toi la sinh vien dai hoc."),
        curated_zh_entry("中文", "zhong1 wen2", "noun", "Chinese language", "tieng Trung", "我学习中文。", "Toi hoc tieng Trung."),
        curated_zh_entry("英文", "ying1 wen2", "noun", "English language", "tieng Anh", "她也会说英文。", "Co ay cung biet noi tieng Anh."),
        curated_zh_entry("学习", "xue2 xi2", "verb", "to study", "hoc tap", "我每天学习中文。", "Toi hoc tieng Trung moi ngay."),
        curated_zh_entry("工作", "gong1 zuo4", "verb", "to work", "lam viec", "我爸爸在医院工作。", "Bo toi lam viec o benh vien."),
        curated_zh_entry("学校", "xue2 xiao4", "noun", "school", "truong hoc", "我的学校很大。", "Truong cua toi rat lon."),
        curated_zh_entry("家", "jia1", "noun", "home", "nha", "我晚上回家。", "Buoi toi toi ve nha."),
        curated_zh_entry("图书馆", "tu2 shu1 guan3", "noun", "library", "thu vien", "我们下午去图书馆。", "Buoi chieu chung toi den thu vien."),
        curated_zh_entry("商店", "shang1 dian4", "noun", "shop", "cua hang", "商店在学校旁边。", "Cua hang o canh truong."),
        curated_zh_entry("水", "shui3", "noun", "water", "nuoc", "请给我一杯水。", "Vui long cho toi mot coc nuoc."),
        curated_zh_entry("茶", "cha2", "noun", "tea", "tra", "我喜欢喝茶。", "Toi thich uong tra."),
        curated_zh_entry("米饭", "mi3 fan4", "noun", "rice", "com", "中午我吃米饭。", "Buoi trua toi an com."),
        curated_zh_entry("苹果", "ping2 guo3", "noun", "apple", "tao", "这个苹果很甜。", "Qua tao nay rat ngot."),
        curated_zh_entry("今天", "jin1 tian1", "noun", "today", "hom nay", "今天我很忙。", "Hom nay toi rat ban."),
        curated_zh_entry("明天", "ming2 tian1", "noun", "tomorrow", "ngay mai", "明天我们有考试。", "Ngay mai chung toi co bai kiem tra."),
        curated_zh_entry("昨天", "zuo2 tian1", "noun", "yesterday", "hom qua", "昨天我在家复习。", "Hom qua toi on bai o nha."),
        curated_zh_entry("早上", "zao3 shang5", "noun", "morning", "buoi sang", "他早上六点起床。", "Anh ay day luc sau gio sang."),
        curated_zh_entry("晚上", "wan3 shang5", "noun", "evening", "buoi toi", "晚上我做作业。", "Buoi toi toi lam bai tap."),
        curated_zh_entry("现在", "xian4 zai4", "noun", "now", "bay gio", "我现在在教室。", "Bay gio toi dang o lop."),
        curated_zh_entry("喜欢", "xi3 huan5", "verb", "to like", "thich", "我喜欢学中文。", "Toi thich hoc tieng Trung."),
        curated_zh_entry("看", "kan4", "verb", "to look; to read", "xem; doc", "我看中文书。", "Toi doc sach tieng Trung."),
        curated_zh_entry("听", "ting1", "verb", "to listen", "nghe", "请听老师的话。", "Hay nghe loi giao vien."),
        curated_zh_entry("说", "shuo1", "verb", "to speak; to say", "noi", "她会说中文。", "Co ay biet noi tieng Trung."),
        curated_zh_entry("写", "xie3", "verb", "to write", "viet", "我写汉字。", "Toi viet chu Han."),
        curated_zh_entry("读", "du2", "verb", "to read aloud", "doc", "请读这个句子。", "Hay doc cau nay."),
        curated_zh_entry("去", "qu4", "verb", "to go", "di", "我明天去学校。", "Ngay mai toi di hoc."),
        curated_zh_entry("来", "lai2", "verb", "to come", "den", "你什么时候来？", "Khi nao ban den?"),
        curated_zh_entry("买", "mai3", "verb", "to buy", "mua", "我想买一本书。", "Toi muon mua mot cuon sach."),
        curated_zh_entry("吃", "chi1", "verb", "to eat", "an", "我们一起吃晚饭。", "Chung toi an toi cung nhau."),
        curated_zh_entry("喝", "he1", "verb", "to drink", "uong", "他不喝咖啡。", "Anh ay khong uong ca phe."),
        curated_zh_entry("有", "you3", "verb", "to have", "co", "我有两个问题。", "Toi co hai cau hoi."),
        curated_zh_entry("没有", "mei2 you3", "verb", "to not have", "khong co", "今天我没有课。", "Hom nay toi khong co lop."),
        curated_zh_entry("在", "zai4", "verb", "to be at; in; on", "o; tai", "老师在办公室。", "Giao vien dang o van phong."),
    ]
}


def load_payload(languages: set[str] | None = None) -> list[dict]:
    payload: list[dict] = []
    if SEED_FILE.exists():
        payload.extend(json.loads(SEED_FILE.read_text(encoding="utf-8")))
    if CURATED_SEED_FILE.exists():
        payload.extend(json.loads(CURATED_SEED_FILE.read_text(encoding="utf-8")))
    payload = [item for item in payload if item.get("language_code") not in CURATED_LANGUAGE_PAYLOADS]
    for code, items in CURATED_LANGUAGE_PAYLOADS.items():
        if languages and code not in languages:
            continue
        payload.extend(items)
    if languages:
        payload = [item for item in payload if item.get("language_code") in languages]
    return payload


async def import_seed(languages: set[str] | None = None) -> None:
    payload = load_payload(languages)
    inserted = 0
    skipped = 0

    await init_db()

    async with AsyncSessionLocal() as session:
        existing_result = await session.execute(select(Language))
        existing_languages = {language.code: language for language in existing_result.scalars().all()}

        for code, display_name in LANGUAGE_MAP.items():
            if code not in existing_languages:
                session.add(Language(code=code, name=display_name))

        await session.flush()

        for code in CURATED_LANGUAGE_PAYLOADS:
            if languages and code not in languages:
                continue
            await session.execute(delete(VocabularyEntry).where(VocabularyEntry.language_code == code))
        await session.flush()

        for item in payload:
            exists = await session.execute(
                VocabularyEntry.__table__.select().where(
                    VocabularyEntry.language_code == item["language_code"],
                    VocabularyEntry.word == item["word"],
                    VocabularyEntry.meaning_en == item["meaning_en"],
                )
            )
            if exists.first():
                skipped += 1
                continue

            session.add(
                VocabularyEntry(
                    language_code=item["language_code"],
                    word=item["word"],
                    reading=item.get("reading"),
                    part_of_speech=item.get("part_of_speech"),
                    meaning_en=item["meaning_en"],
                    meaning_vi=item.get("meaning_vi"),
                    example=item.get("example"),
                    example_meaning_vi=item.get("example_meaning_vi"),
                    source_name=item["source_name"],
                    source_url=item["source_url"],
                )
            )
            inserted += 1

        await session.commit()
        print(f"Imported {inserted} vocabulary rows, skipped {skipped} duplicates")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--languages", nargs="*", help="Chi import cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()
    languages = set(args.languages) if args.languages else None
    asyncio.run(import_seed(languages=languages))


if __name__ == "__main__":
    main()

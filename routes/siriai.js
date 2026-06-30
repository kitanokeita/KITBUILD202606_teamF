const { name } = require('ejs');
var express = require('express');
var router = express.Router();

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// 画像の一時保存先を設定
const upload = multer({ dest: 'uploads/' });

// Gemini APIをOpenAIライブラリ経由で初期化
const openai = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY
});

//DBの読み込み
var sqlite3 = require('sqlite3');
const db = new sqlite3.Database('siriai.db');


// 画像ファイルをData URLに変換する関数
function getImageDataUrl(filePath, mimeType = 'image/png') {
  const imageData = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${imageData}`;
}

/* 
 *GET 
 *:3000/sirial/new
 * new.ejs 知り合いの登録画面
 * すべての変数は記入欄の初期値
 * name 名前
 * age 年齢
 * relation 関係
 * hobby 趣味
 * MBTI　mbti
 * /siriai/newにrender
*/
//routerからの場所
router.get('/new', function (req, res, next) {
  const data = {
    title: "知り合い登録",
    name: "",
    age: "",
    relation: "",
    hobby: "",
    MBTI: "mbti",
    errorMessage: ""
  }
  //ファイル
  res.render('siriai/new', data);
});


/* POST
 *:3000/siriai/new
 * /siriai/new/miiにredirect
*/
router.post('/new', function (req, res, next) {
  //form/add.ejsにdataを送る
  const data = {
    title: "Mii作成ページ",
    name: req.body["name"],
    age: req.body["age"],
    relation: req.body["relation"],
    MBTI: req.body["MBTI"],
    hobby: req.body["hobby"],
    errorMessage: ""
  }

  if (!data.name || !data.age || !data.relation || !data.hobby || !data.MBTI) {
    var errorplace = [];
    if (!data.name) errorplace.push("名前");
    if (!data.age) errorplace.push("年齢");
    if (!data.relation) errorplace.push("関係");
    if (!data.hobby) errorplace.push("趣味");
    if (!data.MBTI) errorplace.push("MBTI");

    data.errorMessage = `${errorplace.join(",")}` + "の欄が未入力ですよ！！すべて入力してね。";
    return res.render("siriai/new", data)
  }
  res.render("siriai/mii", data);
});

/* GET 知り合い一覧を表示 */
/**GET /siriai/itiran
 * 
 */
router.get('/itiran', function (req, res, next) {
const userId = req.user.id;

  // favorite の降順にすることでお気に入り（1）が上に表示される
  //WHERE user_idを追加
  db.all('SELECT * FROM siriai WHERE user_id = ? ORDER BY favorite DESC', [userId], function (err, rows) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.render('siriai/itiran', { title: '知り合い表示ページ', rows });
  });
});

/**
 * /siriai/に間違えて送ってしまった時の対処
 */
router.get('/', function (req, res, next) {
  res.redirect('/');
});

/* POST mii作成ページを表示 */
/**
 * 作成した知り合いを保存するエンドポイント
 * /siriai/mii
 * name
 * age
 * hobby
 * MBTI
 * Miiを保存
 * localhost3000:にリダイレクト
 */
//"INSERT INTO siriai (name , age , MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?)"
router.post('/mii', function (req, res, next) {
  const sql = "INSERT INTO siriai (user_id, name , age , relation, MBTI , hobby , hair , eyes , mouth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const data = [
    req.user.id,//user.!!
    req.body.name,
    req.body.age,
    req.body.relation,
    req.body.MBTI,
    req.body.hobby,
    req.body.hair,
    req.body.eyes,
    req.body.mouth
  ];
  db.run(sql, data, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    res.redirect('/');
  });
});

/**
 * AI読み込み機能
 */
router.post('/ai', function (req, res, next) {
  const data = {
    title: "AIアバター作成",
    name: req.body.name,
    age: req.body.age,
    relation: req.body.relation,
    MBTI: req.body.MBTI,
    hobby: req.body.hobby,
  };
  res.render('siriai/ai', data);
});



/* POST AIによる画像解析 */
///aiのpost通信が埋まっているため
router.post('/analyze', upload.single('faceImage'), async function (req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).send('画像がアップロードされていません。');
    }

    // ユーザーがアップロードした顔写真の処理
    const faceImagePath = req.file.path;
    const faceDataUrl = getImageDataUrl(faceImagePath, req.file.mimetype);

    // AIへ送るデータ配列の初期化
    const contentArray = [
      { 
        type: "text", 
        text: `まずは分析対象の顔写真です。この顔に最も似合う、または似ているパーツ（髪型、目、口）を、この後に提示する候補画像（それぞれ1〜5）の中から選んでください。
               結果は必ず以下のJSON形式のみで出力してください。
               {"hair": 1, "eyes": 1, "mouth": 1}` 
      },
      {
        type: "image_url",
        image_url: { url: faceDataUrl }
      }
    ];

    // パーツ画像（hair1〜5, eyes1〜5, mouth1〜5）を読み込んで配列に追加
    const parts = ['hair', 'eyes', 'mouth'];
    const partsLabels = { hair: '髪型', eyes: '目', mouth: '口' };

    for (const part of parts) {
      contentArray.push({ type: "text", text: `ここからは${partsLabels[part]}の候補画像です。` });
      
      for (let i = 1; i <= 5; i++) {
        // public/img フォルダのパスを指定
        const partFilePath = path.join(__dirname, '../public/img', `${part}${i}.png`);
        
        // ファイルが存在するか確認してから追加
        if (fs.existsSync(partFilePath)) {
          const partDataUrl = getImageDataUrl(partFilePath);
          contentArray.push({ type: "text", text: `${partsLabels[part]}の${i}番:` });
          contentArray.push({
            type: "image_url",
            image_url: { url: partDataUrl }
          });
        }
      }
    }

    // AI解析の実行
    const response = await openai.chat.completions.create({
      model: "gemini-3.1-flash-lite",
      messages: [
        {
          role: "user",
          content: contentArray
        }
      ],
      response_format: { type: "json_object" }
    });

    // 一時ファイル(顔写真)を削除
    fs.unlinkSync(faceImagePath);

    const aiPrediction = JSON.parse(response.choices[0].message.content);

    // Mii作成ページへデータを渡してレンダリング
    res.render('siriai/mii', {
      title: "Mii作成ページ",
      name: req.body.name,
      age: req.body.age,
      relation: req.body.relation,
      hobby: req.body.hobby,
      MBTI: req.body.MBTI,
      hair: aiPrediction.hair,
      eyes: aiPrediction.eyes,
      mouth: aiPrediction.mouth
    });

  } catch (error) {
    console.error(error);
    
    // エラー時に一時ファイルが残っていたら削除
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    
    res.status(500).send('AI解析中にエラーが発生しました。');
  }
});

/* POST 指定したidの知り合いをDBから削除して一覧にリダイレクト */
router.get('/delete', function (req, res, next) {
  var id = req.query.id;
  var userId = req.user.id;
  db.run('DELETE FROM siriai WHERE id = ? AND user_id = ?', [id , userId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }

    res.redirect('/siriai/itiran');
  });
});

/* GET 指定したidの知り合いの編集画面を表示 */
//編集画面が必要
//?はプレースホルダ
router.get('/edit', function (req, res, next) {
  var id = req.query.id;
  var userId = req.user.id;
  
  db.get('SELECT * FROM siriai WHERE id = ? AND user_id = ?', [id, userId], function (err, row) {
    if (err) {
      console.error(err);
      return res.status(500).send('データベースエラー');
    }
    if (!row) {
      return res.status(404).send('データが見つからないか、権限がありません');
    }
    res.render('siriai/edit', {
      title: '知り合い更新',
      id: row.id,
      name: row.name,
      age: row.age,
      relation: row.relation,
      hobby: row.hobby,
      MBTI: row.MBTI,
      errorMessage: ""
    });
  });
});

router.post('/edit', function (req, res, next) {
  var id = req.body.id;
  var userId = req.user.id;
  
  db.run('UPDATE siriai SET name=?, age=?, relation=?, MBTI=?, hobby=? WHERE id=? AND user_id=?',
    [req.body.name, req.body.age, req.body.relation, req.body.MBTI, req.body.hobby, id, userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send('データベースエラー');
      }
      res.redirect('/siriai/itiran');
    });
});

/* GET お気に入りトグル
 * /siriai/favorite?id=3
 * クリックするたびに favorite を 0（なし）↔ 1（あり）で切り替える
 * 切り替え後は一覧ページにリダイレクト
 */
router.get('/favorite', function (req, res, next) {
  var id = req.query.id;
  var userId = req.user.id;

  db.get('SELECT favorite FROM siriai WHERE id = ? AND user_id = ?', [id, userId], function (err, row) {
    if (err || !row) {
      return res.redirect('/siriai/itiran');
    }

    var newFavorite = row.favorite === 1 ? 0 : 1;

    db.run('UPDATE siriai SET favorite = ? WHERE id = ? AND user_id = ?', [newFavorite, id, userId], function (err) {
      res.redirect('/siriai/itiran');
    });
  });
});

module.exports = router;
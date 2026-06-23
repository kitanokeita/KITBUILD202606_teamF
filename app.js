require("dotenv").config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

/**
 * 認証機能およびデータベース操作に必要なモジュール
 */
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt');
var sqlite3 = require('sqlite3').verbose();

/**
 * アプリケーションの各ルートを定義するモジュール
 */
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var siriaiRouter = require('./routes/siriai');

var app = express();

/**
 * SQLiteデータベースへの接続と初期設定
 * siriai.dbに接続し、外部キー制約を有効化します。
 */
var db = new sqlite3.Database('./siriai.db', function(err) {
  if (err) {
    console.error(err.message);
  } else {
    // SQLiteで外部キー制約を有効にするための必須コマンド
    db.run("PRAGMA foreign_keys = ON");
  }
});

/**
 * ビューエンジンの設定
 * テンプレートエンジンとしてEJSを使用し、viewsディレクトリを指定します。
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/**
 * 標準ミドルウェアの設定
 * ロギング、JSONパース、URLエンコード、クッキー解析、静的ファイルの配信を設定します。
 */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * セッションの設定
 * express-sessionを利用して、ユーザーのログイン状態をサーバー側で管理します。
 * * 欠落時の影響:
 * この記述がないと、サーバーはユーザーのログイン状態を記憶できません。
 * ページを移動するたびに毎回ログインを求められるようになり、システムとして成立しなくなります。
 */
app.use(session({
  //secretはバレてはいけないハンコみたいなもの
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

/**
 * Passportの初期化とセッション連携
 * アプリケーション全体でPassportによる認証とセッション管理を有効にします。
 * * 欠落時の影響:
 * initializeがないとPassportの機能自体が起動せず、ログイン処理でエラーが発生します。
 * sessionがないと、ログインに成功してもその状態がセッションに引き継がれず、次のページを開いた瞬間に未ログイン状態に戻ってしまいます。
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * Passport ローカル認証ストラテジーの設定
 * ユーザー名とパスワードを使用したログイン判定ロジックを定義します。
 * * 欠落時の影響:
 * この記述がないと、送られてきたユーザー名とパスワードをデータベースのデータとどう照合すればよいかサーバーが理解できません。
 * 結果として、ログインを試みても「Unknown authentication strategy」などのエラーが発生し、誰もログインできなくなります。
 */
//名前を書かない場合localに名前はなるらしい
passport.use(new LocalStrategy(
  function(username, password, done) {
    db.get("SELECT * FROM users WHERE username = ?", [username], function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false, { message: 'ユーザー名またはパスワードが間違っています。' }); }

      bcrypt.compare(password, user.password, function(err, res) {
        if (res) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'ユーザー名またはパスワードが間違っています。' });
        }
      });
    });
  }
));

/**
 * セッションへのユーザー情報の保存 (シリアライズ)
 * ログイン成功時に、ユーザーIDをセッション空間に記憶させます。
 * * 欠落時の影響:
 * この記述がないと、ログインのパスワード照合に成功しても、発行される入場券(セッション)に「誰の入場券か」という情報(ID)が書き込まれません。
 * そのため、ログイン直後から自分が誰だかサーバーに認識してもらえなくなります。
 */
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

/**
 * セッションからのユーザー情報の復元 (デシリアライズ)
 * リクエストごとにセッションのユーザーIDからデータベースを検索し、ユーザー情報を復元します。
 * * 欠落時の影響:
 * この記述がないと、ブラウザから送られてきた入場券にIDが書かれていても、データベースから具体的なユーザー情報(名前など)を取り出せません。
 * req.userという変数が空っぽになり、「現在ログインしている人の名前を表示する」といった処理がすべてエラーで落ちてしまいます。
 */
passport.deserializeUser(function(id, done) {
  db.get("SELECT id, username FROM users WHERE id = ?", [id], function(err, user) {
    done(err, user);
  });
});

/**
 * 認証確認用のミドルウェア (門番)
 * 未ログインのユーザーが保護されたルートにアクセスした際、ログインページへリダイレクトします。
 * * 欠落時の影響:
 * この関数を通さずにページを表示させてしまうと、URLを直接入力された場合に未ログインの第三者でも知人のデータなどを閲覧・編集できてしまいます。
 * 重大な情報漏洩やデータ改ざんの原因になります。
 *
 * @param {Object} req - Expressのリクエストオブジェクト
 * @param {Object} res - Expressのレスポンスオブジェクト
 * @param {Function} next - 次のミドルウェア関数を呼び出すためのコールバック
 * @returns {void}
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

/**
 * ルーティングの設定
 */

/* トップページ (views/index.ejs) */
app.use('/', indexRouter);

/* ユーザー関連ページ (views/users.ejs) */
app.use('/users', usersRouter);

/* 知人管理ページ (views/siriai/*.ejs) - 認証必須 */
app.use('/siriai', ensureAuthenticated, siriaiRouter);

/**
 * 404エラーハンドラー
 * 該当するルートが存在しない場合、404エラーを作成して次のエラーハンドラーへ渡します。
 */
app.use(function(req, res, next) {
  next(createError(404));
});

/**
 * 全体エラーハンドラー
 * アプリケーション内で発生したエラーを捕捉し、エラーページを描画します。
 */
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
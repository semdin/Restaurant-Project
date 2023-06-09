const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cookieSession = require('cookie-session');


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.use(
  cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    secret: 'mazmegs',
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);


// Multer ayarlarını yap
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});
const upload = multer({ storage: storage });


app.listen(3000, () => {
  console.log('Server has been started on port 3000.');
});

mongoose
  .connect("mongodb+srv://mehmetsemdinaktay:8e5GaYlmmOW8XD3y@cluster0.huw09px.mongodb.net/mazmegs", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB has been started on port 27017"))
  .catch((err) => console.error("MongoDB error", err));

  const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    surname: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      required: true,
      default: 'user',
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
    }
  });

  const restaurantSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true
    },
    open: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      required: true
    },
    close: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      required: true,
    },
    location: {
      type: String,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  });

  const starsSchema = new mongoose.Schema({
    speed: {
      type: Number,
      required: true,
    },
    taste: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    }
  });
  
  const commentsSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    star: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stars',
    },
    comment: {
      type: String,
      required: true
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    }
  });
  
  const foodSchema = new mongoose.Schema({
    name: String,
    content: String,
    price: Number,
    image: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    category: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryFood'
    }],
    base: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BaseFood'
    }]
  });
  
  const categoryFoodSchema = new mongoose.Schema({
    name: String,
    content: String,
    icon: String,
    bases: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "BaseFood"
        }
      ]
  });
  
  const baseFoodSchema = new mongoose.Schema({
    name: String,
    icon: String,
    categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CategoryFood"
        }
      ]
  });

  userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };
  
  
  const User = mongoose.model("User", userSchema);
  const Food = mongoose.model('Food', foodSchema);
  const CategoryFood = mongoose.model('CategoryFood', categoryFoodSchema);
  const BaseFood = mongoose.model('BaseFood', baseFoodSchema);
  const Restaurant = mongoose.model('Restaurant', restaurantSchema);
  const Stars = mongoose.model('Stars', starsSchema);
  const Comments = mongoose.model('Comments', commentsSchema);


  /*Restaurant.updateOne({}, { $unset: { user: "" } })
  .then(() => {
    console.log('Users updated successfully.');
  })
  .catch((err) => {
    console.error(err);
  });*/

  //yeni column ama object olarak
  /*User.updateMany({}, { $set: { restaurant: new mongoose.Types.ObjectId() } })
  .then(() => {
    console.log('Users updated successfully.');
  })
  .catch((err) => {
    console.error(err);
  });*/
  

//database add new column
 /* User.updateMany({}, {$set: {restaurant: ""}})
  .then(result => {
    console.log(result);
  })
  .catch(err => {
    console.log(err);
  });*/

app.get('/', async (req, res) => {

try{
  const user = req.session.user;
  const baseFoods = await BaseFood.find().populate('categories').exec();
  if(!baseFoods){
    return res.status(404).send("baseFoods not found");
  }
  const restaurants = await Restaurant.find().exec();
  if(!restaurants){
    return res.status(404).send("restaurants not found");
  }
  const stars = await Stars.find().populate('restaurant').exec();
  if(!stars){
    return res.status(404).send("stars not found");
  }

  res.render('anasayfa', {title: 'Anasayfa', user: user, baseFoods: baseFoods, restaurants:restaurants, stars:stars});

} catch(error){
  console.log(error);
  res.status(500).send("Internal Server Error");
}
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Giriş bilgilerini doğrulayın
  const user = await User.findOne({email }).populate('restaurant');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email veya şifre hatalı!' });
  }
  
  // Başarılı giriş durumunda
  req.session.user = user;
  return res.json({ message: 'Başarıyla giriş yapıldı.<br>Yönlendiriliyorsunuz...' });
});



// kullanıcının oturumunu sonlandırdığınızda session'dan kullanıcı bilgilerini silin
app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect("/");
});

// Kayıt işlevi
app.post('/register', async (req, res) => {
  const { name, surname, email, password } = req.body;
  try {
    // Check if the user already exists
    const user = await User.findOne({ email });
    if (user) {
        return res.status(409).json({ message: 'Bu email zaten kullanımda!' });
    }

    // Create a new user
    const newUser = new User({ name, surname, email });
    newUser.password = await bcrypt.hash(password, 10);
    await newUser.save();

    // Send a success response
    req.session.user = newUser;
    return res.status(200).json({ message: 'Başarıyla kayıt oluşturuldu<br>Yönlendiriliyorsunuz...' });
  } catch (err) {
      // Handle errors
      console.error(err);
      return res.status(500).json({ message: 'Kayıt yapılırken bir hata oluştu.' });
  }
});


app.get("/profile", function(req,res){
  const user = req.session.user;
  if(user.userType=="user"){
    res.render("profile", {title:'Profile - '+user.name, user: user})
  }
  else if(user.userType=="restaurant"){
    res.render("profile", {title:'Restaurant Profile - '+user.name, user: user})
  }
  else{
    res.redirect("/");
  }
});

app.post("/restoranFiltrele", async (req, res) => {
  const { baseSelect, categorySelect, priorities } = req.body;
  const user = req.session.user;
  try {
    const foods = await Food.find({
      category: { $in: categorySelect },
      base: { $in: baseSelect }
    })
      .populate('category')
      .populate('base')
      .populate({
        path: 'user',
        populate: {
          path: 'restaurant',
          model: 'Restaurant'
        }
      })
      .exec();

    if (!foods) {
      return res.status(404).send("foods not found");
    }
    const stars = await Stars.find().populate('restaurant').exec();
    if(!stars){
      return res.status(404).send("stars not found");
    }

    // Food içerisindeki user ve restaurant bilgilerine erişebilirsiniz
    const populatedFoods = foods.map(food => ({
      ...food.toJSON(),
      restaurant: food.user.restaurant
    }));
    
    res.render("filteredRestaurants", {
      user: user, 
      title:'Filtrelenmiş Restoranlar', 
      foods: populatedFoods, 
      categories: categorySelect, 
      bases: baseSelect, 
      stars: stars,
      priorities: priorities
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Restoran aranırken bir hata oluştu.' });
  }
});


app.post("/restaurants/:restaurantId/filtered", async (req, res) => {
  try {
    const { restaurantId, baseIds, categoryIds } = req.body;

    const user = await User.findOne({ restaurant: restaurantId }).exec();
    if (!user) {
      return res.status(404).send("User not found");
    }
    const baseFoods = await BaseFood.find().populate('categories').exec();
    if(!baseFoods){
      return res.status(404).send("baseFoods not found");
    }

    const foods = await Food.find({ 
      user: user._id, 
      base: { $in: baseIds },
      category: { $in: categoryIds }
  })
  .populate("user category base")
  .exec();

      const restaurant = await Restaurant.findById(restaurantId).exec();
      if (!restaurant) {
        return res.status(404).send("Restaurant not found");
      }

    const stars = await Stars.find({ restaurant: restaurant._id }).exec();
    let averageStars = 0;
    if (stars.length > 0) {
      let totalStars = 0;
      for (let i = 0; i < stars.length; i++) {
        totalStars += stars[i].speed + stars[i].taste + stars[i].price;
      }
      averageStars = totalStars / (stars.length * 3);
    }

    const comments = await Comments.find({restaurant:restaurant._id} ).populate('restaurant star user').exec();
    if(!comments){
      return res.status(404).send("Comments not found");
    }

    if (restaurantId !== "favicon.ico") {
      const user = req.session.user;
      res.render("restoran", {
        title: restaurant.name,
        user: user,
        restaurant: restaurant,
        foods: foods,
        averageStars: averageStars,
        comments:comments,
        baseFoods: baseFoods
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});




app.get('/base/:baseIds/categories', (req, res) => {
  const baseIds = req.params.baseIds.split(","); // get an array of base food IDs

  CategoryFood.find({ bases: { $in: baseIds } })
    .then(categories => {
      res.json(categories);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send("Error retrieving categories");
    });
});




app.get('/category/:categoryIds/:baseFoodIds/foods', (req, res) => {

  const categoryIds = req.params.categoryIds.split(",");
  const baseFoodIds = req.params.baseFoodIds.split(",");

  Food.find({ 
    category: { $in: categoryIds },
    base: { $in: baseFoodIds }
  })
  .then(foods => {
    res.json(foods);
  })
  .catch(err => {
    console.log(err);
    res.status(500).send("Error retrieving foods");
  });
});


app.get("/restaurants/:restaurantId", async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    const user = await User.findOne({ restaurant: restaurantId }).exec();
    if (!user) {
      return res.status(404).send("User not found");
    }
    const baseFoods = await BaseFood.find().populate('categories').exec();
    if(!baseFoods){
      return res.status(404).send("baseFoods not found");
    }

    const foods = await Food.find({ user: user._id })
      .populate("user category base")
      .exec();

      const restaurant = await Restaurant.findById(restaurantId).exec();
      if (!restaurant) {
        return res.status(404).send("Restaurant not found");
      }

    const stars = await Stars.find({ restaurant: restaurant._id }).exec();
    let averageStars = 0;
    if (stars.length > 0) {
      let totalStars = 0;
      for (let i = 0; i < stars.length; i++) {
        totalStars += stars[i].speed + stars[i].taste + stars[i].price;
      }
      averageStars = totalStars / (stars.length * 3);
    }

    const comments = await Comments.find({restaurant:restaurant._id} ).populate('restaurant star user').exec();
    if(!comments){
      return res.status(404).send("Comments not found");
    }

    if (restaurantId !== "favicon.ico") {
      const user = req.session.user;
      res.render("restoran", {
        title: restaurant.name,
        user: user,
        restaurant: restaurant,
        foods: foods,
        averageStars: averageStars,
        comments:comments,
        baseFoods: baseFoods
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/SaveRestProfile', upload.single('image'), async(req, res) => {
  const {name,phone,address,open,close,restaurantId} = req.body;

  if(req.file){
    const filePath = req.file.path;
    const fileName = path.basename(filePath);
    const restaurant =  await Restaurant.findOneAndUpdate(
      { _id: restaurantId },
      { close: close, location: address, name: name , number: phone ,open : open, image: fileName },
      { new: true }
    ).exec();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
  }else{
    const restaurant =  await Restaurant.findOneAndUpdate(
      { _id: restaurantId },
      { close: close, location: address, name: name , number: phone ,open : open},
      { new: true }
    ).exec();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
  }


  const user =  await User.findOne({ restaurant: restaurantId }).populate('restaurant').exec();
  if (!user) {
    return res.status(404).send("User not found");
  }

  req.session.user = user;
  res.redirect("/profile");
});

app.post('/SaveProfile', async (req, res) => {

  const {name,surname,email, userId} = req.body;

  const user = await User.findOneAndUpdate(
    { _id: userId },
    { email: email, name: name, surname: surname },
    { new: true }
  ).populate('restaurant').exec();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  req.session.user = user;
  res.redirect("/profile");
  
  console.log(name,surname,email, userId);
});


app.post('/addFood', upload.single('image'), async (req, res) => {

  const { name, content, price, restaurantId, category, base } = req.body;

  try {

    const user = await User.findOne({ restaurant: restaurantId }).exec();
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (req.file) {
      const filePath = req.file.path;
      const image = path.basename(filePath);
      const newFood = new Food({ name, content, price, image, user, category, base });
      newFood.save();
    }else{
      const image = "";
      const newFood = new Food({ name, content, price, image, user, category, base });
      newFood.save();
    }


    res.redirect(`/restaurants/${restaurantId}`);
  } catch (error) {
    console.error(error);
    res.render('hata', { mesaj: 'Yemek kaydedilirken hata oluştu.' });
  }
});


app.post('/foodAction', async(req, res) => {
  const { action, foodName, foodId, foodContent, foodPrice} = req.body;
  const secondAction = Array.isArray(action) ? action[1] : action;
  if(action[1]){
    const secondAction = Array.isArray(action) ? action[1] : action;
  }
  console.log(action, foodName, foodId, foodContent, foodPrice, secondAction);
  if(secondAction == "update"){
    try {
      const { foodId, restaurantId, foodName, foodContent, foodPrice } = req.body;

      const firstFoodName = Array.isArray(foodName) ? foodName[0] : foodName;
      const firstFoodContent = Array.isArray(foodContent) ? foodContent[0] : foodContent;
      const firstFoodPrice = Array.isArray(foodPrice) ? foodPrice[0] : foodPrice;
      
      const food = await Food.findOneAndUpdate(
        { _id: foodId },
        { name: firstFoodName, content: firstFoodContent, price: firstFoodPrice},
        { new: true }
      ).exec();
    
      if (!food) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.redirect(`/restaurants/${restaurantId}`);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Hata' });
    }
  }
  else if(action =="delete"){
    try {
      const foodId = req.body.foodId;
      const restaurantId = req.body.restaurantId;
      const foodDelete = await Food.findByIdAndDelete(foodId).exec();
      if (!foodDelete) {
          return res.status(409).json({ message: 'Hata!' });
      }
      res.redirect(`/restaurants/${restaurantId}`);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Hata' });
    }
  }

});


app.get('/restoranlar', async (req, res) => {

  try{
    const user = req.session.user;
    const restaurants = await Restaurant.find().exec();
    if(!restaurants){
      return res.status(404).send("restaurants not found");
    }

    const stars = await Stars.find().populate('restaurant').exec();
    if(!stars){
      return res.status(404).send("stars not found");
    }
    res.render('restoranlar', {title: 'Restoranlar', user: user, restaurants:restaurants, stars:stars});
  
    } catch(error){
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
});


app.get("/:navigation", function(req, res){
  
  const navigation = req.params.navigation;
  if(navigation != "favicon.ico"){
    const user = req.session.user;
    res.render(navigation, {title: navigation, user: user});
  }
});


app.post('/degerlendir', async (req, res) => {
  try {
    const { comment, taste, speed, price, restaurantId } = req.body;
    const { user } = req.session;
    
    const newStar = await Stars.create({ speed: speed, taste: taste, price: price, restaurant: restaurantId });
    const starId = newStar._id;

    if (comment) {
      await Comments.create({ comment: comment, restaurant: restaurantId, user, star: starId });
    }

    res.redirect(`/restaurants/${restaurantId}`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});
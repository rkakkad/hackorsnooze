$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $favoriteStories =$('#favorited-articles')
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navLinks = $('.main-nav-links');
  const $userprofile = $('#user-profile');
  
  
  // global storyList variable
  let storyList = null;
  let ownStoryList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /** 
   * Main nav links click functionality
   */
  $navLinks.on('click', '#nav-submit',function(evt) {
    const id = evt.target.id;
    hideElements();
    $allStoriesList.show();
      $("#submit-form").toggle('hidden');
  });
  
  $navLinks.on('click', '#nav-favorites', function(evt) {
    const id = evt.target.id;
    const storyType = 'favStory'
      hideElements()

      $favoriteStories.empty();
      for (let story of currentUser.favorites) {
        const result = generateStoryHTML(story,storyType);
        $favoriteStories.append(result);
      }
      $favoriteStories.show();
  });


  $navLinks.on('click', '#nav-my-stories', function(evt) {
    const id = evt.target.id;
    const  storyType = 'ownStory';
    hideElements();
    $ownStories.empty();
    for (let story of currentUser.ownStories) {
        const result = generateStoryHTML(story,storyType);
        $ownStories.append(result);
      }
    $ownStories.show();

  });


  /** 
  * Submit story form functionality 
  */
 $('#submit-form').on('submit', async function(evt) {
   evt.preventDefault();
   let author = $("#author").val();
   let title = $("#title").val();
   let url = $('#url').val();

   let story = {author, title, url};
   storyList = await StoryList.getStories();

   $('#submit-form').each(function() {
    this.reset();
   });

   await storyList.addStory(currentUser, story);

    currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);
    console.log(currentUser);    
   $("#submit-form").slideUp();

    
})



  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $('.articles-container').on('click', ".star", function(e) {
    let $target = $(e.target);
    const storyId= e.target.parentElement.parentElement.id;

    // check if already favorited
    if($target.hasClass('fas')) {
      // remove from favorite list
      currentUser.removeFavoriteStory(storyId)
    } else {
      // add to favorite list
      currentUser.addFavoriteStory(storyId);
    }
    $target.toggleClass('fas');
    $target.toggleClass('far');
  })

  /**
   * Function to handle clikcing in favorites menu
   */
  $('.favorited-articles').on('click', ".star", function(e) {
    let $target = $(e.target);
    console.log($target);

    // // check if already favorited
    // if($target.hasClass('fas')) {
    //   // remove from favorite list
    //   currentUser.removeFavoriteStory(storyId)
    // } else {
    //   // add to favorite list
    //   currentUser.addFavoriteStory(storyId);
    // }
    // $target.toggleClass('fas')
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, storyType) {
    let hostName = getHostName(story.url);
    let isFavorite= checkFavorite(story);
    let deleteIconElem = '';
    let starType = (storyType==='favStory' || checkFavorite(story)) ? "fas" : "far";

    // add delete icon for my stories
    if(storyType == 'ownStory') {
      deleteIconElem = 
      `<span class="trash-can">
      <i class="fas fa-trash-alt"></i>
      </span>`
    } 
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${deleteIconElem}
        <span class="star">
          <i class=" ${starType} fa-star">
          </i>
          </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoriteStories
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navLinks.toggleClass('hidden');
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  /**
   * cHeck if a story is in a favorite list
   */
  function checkFavorite(story) {
    if(currentUser) {
      for(let favStory of currentUser.favorites) {
        if (favStory.storyId==story.storyId) {
          return true;
       };
      }
    }
    return false;
  } 
});

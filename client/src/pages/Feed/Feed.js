import React from 'react';
import openSocket from 'socket.io-client';
import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends React.Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    fetch('http://localhost:4000/auth/status', {
      headers: {Authorization: `Bearer ${this.props.token}`}
    })
    .then(res => {
      if (res.status !== 200) throw new Error('Failed to fetch user status.');
      return res.json();
    })
    .then(resData => this.setState({status: resData.status}))
    .catch(this.catchError);
    this.loadPosts();
    const socket = openSocket('http://localhost:4000');
    // 'posts' event emitted from server when new post is created
    socket.on('posts', data => {
      if(data.action === 'create') this.postAdded(data.post);
      if(data.action === 'update') this.postUpdated(data.post);
      if(data.action === 'delete') this.loadPosts();
    });
  }

  // responding to socket.io when new post is created
  postAdded = newPost => {
    this.setState(prevState => {
      const postsList = [...prevState.posts];
      // if on page 1, add new post to top of list
      if (prevState.postPage === 1) {
        if (prevState.posts.length >= 2) postsList.pop();
        postsList.unshift(newPost);
      }
      return {posts: postsList, totalPosts: prevState.totalPosts + 1};
    });
  };

  // responding to socket.io when a post is updated
  postUpdated = updatedPost => {
    this.setState(prevState => {
      const postsList = [...prevState.posts];
      const updatedPostIndex = postsList.findIndex(p => p._id === updatedPost._id);
      if (updatedPostIndex > -1) postsList[updatedPostIndex] = updatedPost;
      return {posts: postsList};
    });
  };

  loadPosts = direction => {
    if (direction) this.setState({postsLoading: true, posts: []});
    let page = this.state.postPage;
    if (direction === 'next') this.setState({postPage: ++page});
    if (direction === 'previous') this.setState({postPage: --page});
    fetch(
      `http://localhost:4000/feed/posts?page=${page}`,
      {headers: {Authorization: `Bearer ${this.props.token}`}}
    )
    // either {message, posts, totalItems} from 'feedController' (success) or
    // {errMsg, errData} from 'app.js' (error) to be handled in catch block
    .then(res => res.json())
    .then(resData => {
      if(resData.errMsg) throw new Error(resData.errMsg);
      this.setState({
        posts: resData.posts,
        totalPosts: resData.totalItems,
        postsLoading: false
      });
    })
    .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('http://localhost:4000/auth/status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.props.token}`
      },
      body: JSON.stringify({status: this.state.status})
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) throw new Error("Can't update status!");
        return res.json();
      })
      .then(resData => console.log(resData))
      .catch(this.catchError);
  };

  // 'NEW POST' button clicked -> show 'FeedEdit' component
  newPostHandler = () => {
    this.setState({isEditing: true});
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = {...prevState.posts.find(p => p._id === postId)};
      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({isEditing: false, editPost: null});
  };

  // 'ACCEPT' button in modal clicked
  finishEditHandler = postData => {
    this.setState({editLoading: true});
    let url = 'http://localhost:4000/feed/posts';
    let method= 'POST';
    if (this.state.editPost) {
      url = `http://localhost:4000/feed/posts/${this.state.editPost._id}`;
      method = 'PUT';
    }
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('image', postData.image);
    fetch(url, {
      method,
      body: formData,
      headers: {Authorization: `Bearer ${this.props.token}`}
    })
    // either {message, post} from 'feedController' (success) or
    // {errMsg, errData} from 'app.js' (error) to be handled in catch block
    .then(res => res.json())
    .then(resData => {
      if(resData.errMsg) throw new Error(resData.errMsg);
      // new post data is handled by socket.io 'emit' not 'broadcast'
      this.setState(prevState => {
        return {
          isEditing: false,
          editPost: null,
          editLoading: false
        };
      });
    })
    .catch(err => {
      console.log('Feed.js - finishEditHandler error:\n', err);
      this.setState({
        isEditing: false,
        editPost: null,
        editLoading: false,
        error: err
      });
    });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({status: value});
  };

  deletePostHandler = id => {
    this.setState({postsLoading: true});
    fetch(
      `http://localhost:4000/feed/posts/${id}`,
      {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${this.props.token}`}
      }
    )
    // either {message} from 'feedController' (success) or
    // {errMsg, errData} from 'app.js' (error) to be handled in catch block
    .then(res => res.json())
    .then(resData => {
      if(resData.errMsg) throw new Error(resData.errMsg);
      // posts data handled by socket.io 'emit' not 'broadcast', will call 'loadPosts()'
    })
    .catch(err => {
      console.log(err);
      this.setState({postsLoading: false});
    });
  };

  errorHandler = () => {
    this.setState({error: null});
  };

  catchError = error => {
    this.setState({error: error});
  };

  render() {
    return (
      <>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{textAlign: 'center', marginTop: '2rem'}}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{textAlign: 'center'}}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(p => (
                <Post
                  key={p._id}
                  id={p._id}
                  author={p.creator.name}
                  date={new Date(p.createdAt).toLocaleDateString('en-US')}
                  title={p.title}
                  image={p.imageUrl}
                  content={p.content}
                  onStartEdit={this.startEditPostHandler.bind(this, p._id)}
                  onDelete={this.deletePostHandler.bind(this, p._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </>
    );
  }
}

export default Feed;

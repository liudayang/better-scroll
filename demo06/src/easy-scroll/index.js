import {
  getRect, addEvent, offset, getNow, ease, 
  DIRECTION_UP, DIRECTION_DOWN, DIRECTION_LEFT, DIRECTION_RIGHT,
  momentum
} from './utils'

class EScroll{
  constructor(el, options) {
    this.wrapper = typeof el === 'string' ? document.querySelector(el) : el
    this.scroller = this.wrapper.children[0]
    this.scrollerStyle = this.scroller.style
    this.options = {
      bounceTime: 800, // 设置回弹动画的动画时长
      deceleration: 0.0015, // momentum 动画的减速度
      swipeBounceTime: 500, // 单位ms,设置当运行 momentum 动画时，超过边缘后的回弹整个动画时间。
      swipeTime: 2500, // 设置 momentum 动画的动画时长。
      bounce: true, // 当滚动超过边缘的时候会有一小段回弹动画。设置为 true 则开启动画
      momentumLimitTime: 300, //快速滑动的时间小于 momentumLimitTime，才能开启 momentum 动画
      momentumLimitDistance: 15  //快速滑动的距离大于 momentumLimitDistance，才能开启 momentum 动画。
    }
    this._init()
  }
  _init() {
    this.x = 0
    this.y = 0
    this.directionX = 0
    this.directionY = 0
    addEvent(this.wrapper, 'touchstart', (e) => {
      this._start(e)
    })
    addEvent(this.wrapper, 'touchmove', (e) => {
      this._move(e)
    })
    addEvent(this.wrapper, 'touchend', (e) => {
      this._end(e)
    })
    addEvent(this.wrapper, 'touchcancel', (e) => {
      this._end(e)
    })
    addEvent(this.wrapper, 'webkitTransitionEnd', (e) => {
      this._transitionEnd(e)
    })
    this.refresh()
  }
  refresh() {
    let wrapperRect = getRect(this.wrapper)
    this.wrapperWidth = wrapperRect.width
    this.wrapperHeight = wrapperRect.height

    let scrollerRect = getRect(this.scroller)
    this.scrollerWidth = Math.round(scrollerRect.width)
    this.scrollerHeight = Math.round(scrollerRect.height)

    this.relativeX = scrollerRect.left
    this.relativeY = scrollerRect.top
 
    this.minScrollX = 0
    this.minScrollY = 0

    this.maxScrollX = 0
    this.maxScrollY = this.wrapperHeight - this.scrollerHeight
    if (this.maxScrollY < 0) {
      this.maxScrollY -= this.relativeY
      this.minScrollY = -this.relativeY
    }
    this.endTime = 0
    this.directionX = 0
    this.directionY = 0
    this.wrapperOffset = offset(this.wrapper)
  }
  _start(e) { 
    e.preventDefault()

    this.distX = 0
    this.distY = 0 
    this.directionX = 0
    this.directionY = 0
    this.startTime = getNow()
    this.stop()
    let point = e.touches ? e.touches[0] : e

    this.startX = this.x
    this.startY = this.y
    this.absStartX = this.x
    this.absStartY = this.y
    this.pointX = point.pageX
    this.pointY = point.pageY
  }
  _move(e) {
    e.preventDefault()
    let point = e.touches ? e.touches[0] : e
    let deltaX = point.pageX - this.pointX
    let deltaY = point.pageY - this.pointY
    this.pointX = point.pageX
    this.pointY = point.pageY
    this.distX += deltaX
    this.distY += deltaY
    let absDistX = Math.abs(this.distX)
    let absDistY = Math.abs(this.distY)
    let timestamp = getNow()

    deltaX = 0
    let newX = this.x + deltaX
    let newY = this.y + deltaY

    let top = false
    let bottom = false
    // Slow down or stop if outside of the boundaries
    const bounce = this.options.bounce
    if (bounce !== false) {
      top = bounce.top === undefined ? true : bounce.top
      bottom = bounce.bottom === undefined ? true : bounce.bottom
    }

    if (newY > this.minScrollY || newY < this.maxScrollY) {
      if ((newY > this.minScrollY  && top) || (newY < this.maxScrollY && bottom)) {
        newY = this.y + deltaY / 3
      } else {
        newY = newY > this.minScrollY ? this.minScrollY : this.maxScrollY
      }
    }
    this._translate(newX, newY)

    if (timestamp - this.startTime > this.options.momentumLimitTime) {
      this.startTime = timestamp
      this.startX = this.x
      this.startY = this.y
    }

    let scrollLeft = document.documentElement.scrollLeft || window.pageXOffset || document.body.scrollLeft
    let scrollTop = document.documentElement.scrollTop || window.pageYOffset || document.body.scrollTop

    let pX = this.pointX - scrollLeft
    let pY = this.pointY - scrollTop

    if (pX > document.documentElement.clientWidth - this.options.momentumLimitDistance || pX < this.options.momentumLimitDistance || pY < this.options.momentumLimitDistance || pY > document.documentElement.clientHeight - this.options.momentumLimitDistance
    ) {
      this._end(e)
    }
  }
  _end(e) {
    e.preventDefault()
    this.isInTransition = false

    let newX = Math.round(this.x)
    let newY = Math.round(this.y)

    let deltaX = newX - this.absStartX
    let deltaY = newY - this.absStartY
    this.directionX = deltaX > 0 ? DIRECTION_RIGHT : deltaX < 0 ? DIRECTION_LEFT : 0
    this.directionY = deltaY > 0 ? DIRECTION_DOWN : deltaY < 0 ? DIRECTION_UP : 0

    if (this.resetPosition(this.options.bounceTime, ease.bounce)) {
      return
    }

    this._translate(newX, newY)

    this.endTime = getNow()
    let duration = this.endTime - this.startTime
    let absDistX = Math.abs(newX - this.startX)
    let absDistY = Math.abs(newY - this.startY)

    let time = 0
    if (duration < this.options.momentumLimitTime && (
      absDistY > this.options.momentumLimitDistance ||
      absDistX > this.options.momentumLimitDistance)
    ) {
      let top = false
      let bottom = false
      const bounce = this.options.bounce
      if (bounce !== false) {
        top = bounce.top === undefined ? true : bounce.top
        bottom = bounce.bottom === undefined ? true : bounce.bottom
      }
      const wrapperHeight = ((this.directionY === DIRECTION_DOWN && top) || (this.directionY === DIRECTION_UP && bottom)) ? this.wrapperHeight : 0
      let momentumY = momentum(this.y, this.startY, duration, this.maxScrollY, this.minScrollY, wrapperHeight, this.options)
      newX = newX
      newY = momentumY.destination
      time = momentumY.duration
      this.isInTransition = true

    }

    let easing = ease.swipe

    if (newX !== this.x || newY !== this.y) {
      if (newX > this.minScrollX ||
          newX < this.maxScrollX ||
          newY > this.minScrollY ||
          newY < this.maxScrollY) {
          easing = ease.swipeBounce
      }
      this.scrollTo(newX, newY, time, easing)
      return
    }
  }
  _transitionEnd(e) {
    if (e.target !== this.scroller || !this.isInTransition) {
      return
    }
    this._transitionTime()
    if (!this.resetPosition(this.options.bounceTime, ease.bounce)) {
      this.isInTransition = false
    }
  }
  _translate(x, y) {
    this.scrollerStyle['webkitTransform'] = `translate(${x}px,${y}px) translateZ(0)`
    this.x = x
    this.y = y    
  }
  resetPosition(time = 0, easeing = ease.bounce) {
    let x = this.x
    let y = this.y
    let roundY = Math.round(y)
    if (roundY > this.minScrollY) {
      y = this.minScrollY
    } else if (roundY < this.maxScrollY) {
      y = this.maxScrollY
    }
    if (y === this.y) {
      return false
    }
    this.scrollTo(x, y, time, easeing)
    return true
  }
  scrollTo(x, y, time = 0, easing = ease.bounce) {
    this.isInTransition = time > 0 && (x !== this.x || y !== this.y)
    this._transitionTimingFunction(easing.style)
    this._transitionTime(time)
    this._translate(x, y)
  }

  _transitionTimingFunction(easing) {
    this.scrollerStyle['webkitTransitionTimingFunction'] = easing
  }
  _transitionTime(time = 0) {
    this.scrollerStyle['webkitTransitionDuration'] = time + 'ms'
  }
  _translate(x, y) {
    this.scrollerStyle['webkitTransform'] = `translate(${x}px,${y}px) translateZ(0)`
    this.x = x
    this.y = y    
  }
  stop () {
      if (this.isInTransition) {
        this.isInTransition = false
        let pos = this.getComputedPosition()
        this._translate(pos.x, pos.y)
      }
  }
  getComputedPosition() {
      let matrix = window.getComputedStyle(this.scroller, null)
      let x
      let y
      matrix = matrix['webkitTransform'].split(')')[0].split(', ')
      x = +(matrix[12] || matrix[4])
      y = +(matrix[13] || matrix[5])
      return { x, y }
  }
}

export default EScroll
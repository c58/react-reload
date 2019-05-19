import React from 'react'
import { mount } from 'enzyme'
import createLoader from './'

const flushPromises = () => new Promise(resolve => setImmediate(resolve))

const setup = options => {
  const renderProp = jest.fn()
  const loaderObj = {
    cleanup: jest.fn(),
    loader: jest.fn(),
    actions: {
      customAction: jest.fn()
    }
  }
  const loaderFunc = jest.fn(() => loaderObj)
  const { Loader, Consumer } = createLoader(loaderFunc, options)
  const render = props =>
    mount(<Loader {...props}>{props?.children || renderProp}</Loader>)
  return { Loader, Consumer, loaderObj, loaderFunc, renderProp, render }
}

describe('React-Reload', () => {
  beforeEach(() => {
    global.setTimeout = func => func()
    jest.clearAllMocks()
  })

  it('should load data on render', async () => {
    const { render, loaderObj, renderProp } = setup()
    loaderObj.loader.mockReturnValue('test')
    render({ options: { a: 1 } })

    expect(renderProp).toHaveBeenCalledTimes(2)
    expect(renderProp).toHaveBeenNthCalledWith(1, {
      state: {
        data: null,
        error: null,
        loadedOnce: false,
        loading: true,
        options: { a: 1 },
        rawError: null
      },
      actions: {
        retry: expect.anything(),
        customAction: expect.anything()
      }
    })
    expect(renderProp).toHaveBeenNthCalledWith(2, {
      state: {
        data: 'test',
        error: null,
        loadedOnce: true,
        loading: false,
        options: { a: 1 },
        rawError: null
      },
      actions: {
        retry: expect.anything(),
        customAction: expect.anything()
      }
    })
  })

  it('should re-load data on re-render when options changed', async () => {
    const { render, loaderObj, renderProp, loaderFunc } = setup()
    loaderObj.loader.mockReturnValue('test')
    const wrapper = render({ options: { a: 1 } })
    loaderObj.loader.mockReturnValue('test 2')
    wrapper.setProps({ options: { a: 2 } })

    expect(loaderObj.cleanup).toHaveBeenCalledTimes(1)
    expect(loaderFunc).toHaveBeenCalledTimes(2)
    expect(renderProp).toHaveBeenCalledTimes(4)
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test',
          loading: false,
          options: { a: 1 }
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test 2',
          loading: false,
          options: { a: 2 }
        })
      })
    )
  })

  it('should NOT re-load data on re-render when options NOT changed', async () => {
    const { render, loaderObj, renderProp } = setup()
    loaderObj.loader.mockReturnValue('test')
    const wrapper = render({ options: { a: 1 } })
    loaderObj.loader.mockReturnValue('test 2')
    wrapper.setProps({ options: { a: 1 } })

    expect(renderProp).toHaveBeenCalledTimes(3)
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test',
          loading: false,
          options: { a: 1 }
        })
      })
    )
  })

  it('should handle SYNC error from the loader', () => {
    const { render, loaderObj, renderProp } = setup()
    const error = new Error('ooops')
    loaderObj.loader.mockImplementation(() => {
      throw error
    })
    render({ options: { a: 1 } })

    expect(renderProp).toHaveBeenCalledTimes(2)
    expect(renderProp).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: false,
          error: 'ooops',
          rawError: error,
          options: { a: 1 }
        })
      })
    )
  })

  it('should handle ASYNC error from the loader', async () => {
    const { render, loaderObj, renderProp } = setup()
    loaderObj.loader.mockImplementation(() =>
      Promise.reject(new Error('ooops'))
    )
    render({ options: { a: 1 } })
    await flushPromises()

    expect(renderProp).toHaveBeenCalledTimes(3)
    expect(renderProp).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: true,
          error: null,
          options: { a: 1 }
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: false,
          error: 'ooops',
          options: { a: 1 }
        })
      })
    )
  })

  it('should provide a state to the loaderFunc', () => {
    const { render, loaderObj, loaderFunc } = setup()
    loaderObj.loader.mockReturnValue('test')
    render({ options: { a: 1 } })

    expect(loaderFunc).toHaveBeenCalledTimes(1)
    expect(loaderFunc).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        setData: expect.any(Function),
        retry: expect.any(Function),
        iteration: 1,
        destroyed: false,
        data: 'test',
        options: { a: 1 },
        loading: false,
        error: null,
        rawError: null,
        loadedOnce: true
      })
    )
  })

  it('should provide a way to set data from the loader', async () => {
    const { render, loaderObj, renderProp, loaderFunc } = setup()
    loaderObj.loader.mockImplementation(async () => {
      loaderFunc.mock.calls[0][0].setData('test data')
      await flushPromises()
      return 'test'
    })
    const wrapper = render({ options: { a: 1 } })
    await flushPromises()
    await flushPromises()
    wrapper.update()

    expect(renderProp).toHaveBeenCalledTimes(3)
    expect(renderProp).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test data',
          loading: true
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test',
          loading: false
        })
      })
    )
  })

  it('should provide a way to retry from the loader', async () => {
    const { render, loaderObj, renderProp, loaderFunc } = setup()
    loaderObj.loader.mockImplementation(() => {
      return 'test'
    })
    const wrapper = render({ options: { a: 1 } })
    loaderFunc.mock.calls[0][0].retry()
    wrapper.update()

    expect(loaderObj.cleanup).toHaveBeenCalledTimes(1)
    expect(loaderFunc).toHaveBeenCalledTimes(2)
    expect(renderProp).toHaveBeenCalledTimes(3)
    expect(renderProp).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test',
          loading: false
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test',
          loading: false
        })
      })
    )
  })

  it('should override options from props if not equal from state (controlled)', () => {
    const onStateUpdate = jest.fn()
    const { render, loaderObj, loaderFunc } = setup()
    loaderObj.loader.mockReturnValue('test')
    render({
      options: { a: 1 },
      state: { options: { a: 2 } },
      onStateUpdate
    })

    expect(onStateUpdate).toHaveBeenCalledTimes(1)
    expect(onStateUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: 'test',
        options: { a: 1 }
      })
    )
    expect(loaderFunc).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        options: { a: 1 }
      })
    )
  })

  it('should override options from props if not equal from state (un-controlled)', () => {
    const onStateUpdate = jest.fn()
    const { render, loaderObj, loaderFunc } = setup()
    loaderObj.loader.mockReturnValue('test')
    const wrapper = render({
      options: { a: 1 },
      onStateUpdate
    })

    expect(onStateUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: 'test',
        options: { a: 1 }
      })
    )
    expect(loaderFunc).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        options: { a: 1 }
      })
    )

    wrapper.setProps({ options: { a: 2 } })

    expect(onStateUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: 'test',
        options: { a: 2 }
      })
    )
    expect(loaderFunc).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        options: { a: 2 }
      })
    )
  })

  it('should cleanup on unmount', () => {
    const { render, loaderObj } = setup()
    const wrapper = render()
    wrapper.unmount()

    expect(loaderObj.cleanup).toHaveBeenCalledTimes(1)
  })

  it('should set empty state on unmount on controlled mode if enabled', async () => {
    const onStateUpdate = jest.fn()
    const { render, loaderObj } = setup()
    loaderObj.loader.mockReturnValue('test')
    const wrapper = render({
      emptyOnUnmount: true,
      options: { a: 1 },
      state: { options: { a: 2 } },
      onStateUpdate
    })
    wrapper.unmount()
    await flushPromises()

    expect(onStateUpdate).toHaveBeenCalledTimes(2)
    expect(onStateUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: 'test',
        options: { a: 1 }
      })
    )
    expect(onStateUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: null,
        options: {}
      })
    )
  })

  it('should notify about stat update when onStateUpdate provided', () => {
    const onStateUpdate = jest.fn()
    const { render } = setup()
    const wrapper = render({ onStateUpdate })
    wrapper.unmount()

    expect(onStateUpdate).toHaveBeenCalledTimes(1)
  })

  it('should ignore results from previous load if new one is active', async () => {
    const { render, loaderObj, renderProp } = setup()
    const defers = jest.fn()
    loaderObj.loader.mockImplementation(() => new Promise(defers))
    const wrapper = render()
    wrapper.setProps({ options: { a: 1 } })
    defers.mock.calls[0][0]('test 1')
    defers.mock.calls[1][0]('test 2')
    await flushPromises()
    await flushPromises()
    await flushPromises()
    wrapper.update()

    expect(renderProp).toHaveBeenCalledTimes(5)
    expect(renderProp).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: true,
          options: undefined
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: true,
          options: undefined
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        state: expect.objectContaining({
          data: null,
          loading: true,
          options: { a: 1 }
        })
      })
    )
    expect(renderProp).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        state: expect.objectContaining({
          data: 'test 2',
          loading: false,
          options: { a: 1 }
        })
      })
    )
  })

  it('should provide the stat with react context', () => {
    const consumer = jest.fn()
    const { render, loaderObj, Consumer } = setup()
    loaderObj.loader.mockReturnValue('test')
    render({
      options: { a: 1 },
      children: (
        <div>
          <Consumer>{consumer}</Consumer>
        </div>
      )
    })

    expect(consumer).toHaveBeenCalledTimes(2)
    expect(consumer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actions: {
          retry: expect.any(Function),
          customAction: expect.any(Function)
        },
        state: {
          data: null,
          options: { a: 1 },
          loading: true,
          error: null,
          rawError: null,
          loadedOnce: false
        }
      })
    )
    expect(consumer).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actions: {
          retry: expect.any(Function),
          customAction: expect.any(Function)
        },
        state: {
          data: 'test',
          options: { a: 1 },
          loading: false,
          error: null,
          rawError: null,
          loadedOnce: true
        }
      })
    )
  })
})

import React from 'react'
import { Outlet } from 'react-router'

function Auth() {
  return (
<div className='flex justify-center pt-[30px] '> 
    <Outlet/>
</div>
  )
}

export default Auth

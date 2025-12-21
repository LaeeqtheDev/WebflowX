import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@radix-ui/react-separator'
import React, {useState} from 'react'
import {FcGoogle} from 'react-icons/fc'
import {FaGithub} from 'react-icons/fa'
import { SignInFlow } from '../types/types'



interface SignUpCardProps {

  setState: (state: SignInFlow) => void
}

export const SignUpCard = ({setState}: SignUpCardProps) => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');


  return (
    <Card className='w-full h-full p-12 border-2 drop-shadow-2xl'>
     <div className='flex gap-3 mx-auto items-center justify-center'>

     <div className='w-14 h-14 rounded-full bg-black items-center justify-center mx-auto flex'>
      <img src={'/flash.png'} alt='Logo' className='w-12 h-12 mb-0 mt-0 mx-auto'/>
      </div>

      <h1>Webflow<span className='font-extrabold text-2xl text-orange-500'>X</span></h1>
     </div>
     
      <CardHeader className='px-0 pt-8'>
        <CardTitle>Sign Up to Continue</CardTitle>
        <CardDescription>
        Use your email or another service to continue
      </CardDescription>
      </CardHeader>
    
      <CardContent className='space-y-5 px-0 pb-0'>
        {/* Sign in form elements will go here */}
        <form className='space-y-2.5'>
          <Input
          disabled={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='Email'
          type='email'
          required
          />

          <Input
          disabled={false}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Password'
          type='password'
          required
          />

          <Input
          disabled={false}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder='Confirm Password'
          type='password'
          required
          />

          <Button type='submit'className='w-full bg-black/70 hover:bg-black cursor-pointer' size="lg" disabled={false}>Continue</Button>

          
        </form>
        <Separator/>

        <div className='flex flex-col gap-y-2.5'>
          <Button disabled={false}
          onClick={() => {}}
          variant={'outline'}
          size={'lg'}
          className='w-full relative flex items-center justify-center gap-x-2.5 cursor-pointer'
          >
            <FcGoogle size={20} />
            Continue with Google
          </Button>

          <Button disabled={false}
          onClick={() => {}}
          variant={'outline'}
          size={'lg'}
          className='w-full relative flex items-center justify-center gap-x-2.5  cursor-pointer'
          >
            <FaGithub size={20} />
            Continue with Github
          </Button>
        </div>
        <p>
         Already have an account? <span onClick={()=> setState("signIn")} className='text-sky-700 hover:underline cursor-pointer'>Sign in</span>
        </p>

      </CardContent>
    </Card>
  )
}
